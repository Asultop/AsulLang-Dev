# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目概述

ALang (Asul Language) 是一款基于 C++17 的轻量脚本语言解释器，专注于嵌入式脚本扩展与语言特性验证。核心管线：**词法分析 -> 语法分析 -> AST -> 解释执行**。

## 构建与运行

```bash
# 构建（Unix/macOS）
mkdir -p build_cmake && cd build_cmake && cmake .. && cmake --build . -- -j $(nproc)

# 构建（Windows Visual Studio）
mkdir build && cd build && cmake .. && cmake --build . --config Release -- -m

# 运行
./build_cmake/alang                              # REPL
./build_cmake/alang -f Example/example.alang     # 执行脚本
./runAllTests.sh                                  # 全部测试
./funcTest.sh                                     # 功能测试
./errorTest.sh                                    # 错误测试
```

可执行文件：`build_cmake/alang`（Windows: `build/Release/alang.exe`）。LSP 服务器：`vscode-extension/bin/alang-lsp`。

## 架构

### 核心管线（`asul` 命名空间）

```
源码 → AsulLexer → Token 流 → AsulParser → AST → AsulInterpreter → 执行
                                                    ↑
                                          AsulRuntime (值/环境/类)
                                          AsulAsync   (异步接口)
                                          AsulPackages/* (标准库)
```

| 文件 | 职责 |
|---|---|
| `src/AsulLexer.h/cpp` | 词法分析器 |
| `src/AsulParser.h/cpp` | 递归下降语法分析器 |
| `src/AsulAst.h` | AST 节点定义（Expr/Stmt 继承体系，`shared_ptr` 堆分配） |
| `src/AsulRuntime.h/cpp` | 值系统（`variant`）、Environment（作用域链）、Function、ClassInfo、Instance、PromiseState |
| `src/AsulInterpreter.h` | **单体解释器**（~3200 行，全部在头文件中）。`evaluate()` 处理表达式，`execute()` 处理语句 |
| `src/AsulAsync.h` | 异步抽象接口，解耦标准库与解释器 |
| `ALangEngine.h/cpp` | 宿主集成门面层（Facade） |
| `Console.cpp` | CLI 入口、REPL 循环 |
| `AlangLsp.cpp` | LSP 语言服务器 |

### 关键设计

- **值类型**：`ValueTag = variant<monostate, double, string, bool, shared_ptr<Function>, shared_ptr<Array>, shared_ptr<Object>, shared_ptr<ClassInfo>, shared_ptr<Instance>, shared_ptr<PromiseState>>`
- **作用域**：`shared_ptr<Environment>` parent 链实现词法作用域
- **控制流**：异常作为信号（`ReturnSignal`/`BreakSignal`/`ContinueSignal`/`ExceptionSignal`）——有意设计，用于非局部跳出
- **运算符重载**：通过 `findMethod` 查找 `__add__` 等魔术方法
- **多继承**：`supers` 向量线性查找（无 C3 线性化）

### 标准库包

位于 `src/AsulPackages/Std/*/` 和 `src/AsulPackages/{Json,Xml,Yaml,Csv}/`。全部在 `src/AsulInterpreter.cpp` 的 `registerExternalPackages()` 中注册。共 21 个包。

---

## 包管理与 import 系统深度分析

### import 语法全景

ALang 支持以下 import 形式：

```javascript
import std.math.*;                    // 通配符导入（加载包中所有符号到当前环境）
import std.math.pi;                   // 单符号导入
import std.math.(pi, abs);            // 多符号导入
import std.math;                      // 包对象导入（绑定包本身为变量 math）
import json;                          // 简写形式（映射为 __module__ 特殊标记）
import "path/to/file.alang";          // 文件导入
import "path/to/file" as mod;         // 文件导入 + 别名
from std.math import pi;              // from 语法
from "file.alang" import symbol;      // from 文件语法
import (std.math.pi, "file.alang");   // 混合导入
```

### 包管理存在的问题

#### 1. 懒加载机制形同虚设

`Interpreter` 中有 `lazyPackages` 机制（`registerLazyPackage` / `loadLazyPackage`），但**实际上几乎没有包使用它**。`registerExternalPackages()` 直接调用每个包的 `register*Package()` 函数，全部立即注册：

```cpp
// src/AsulInterpreter.cpp — 所有包立即注册，无一懒加载
void registerExternalPackages(asul::Interpreter& interp) {
    asul::registerStdPathPackage(interp);    // 立即注册
    asul::registerStdStringPackage(interp);   // 立即注册
    asul::registerStdMathPackage(interp);     // 立即注册
    // ... 共 21 个包，全部立即注册
}
```

这意味着即使脚本只用 `import json;`，全部 21 个包（含网络、加密、FFI 等重量级模块）都会在初始化时注册。`loadLazyPackage` 只在通配符导入时作为 fallback 被调用，但实际从未命中。

#### 2. 通配符导入（`import std.*`）破坏懒加载

```cpp
// src/AsulInterpreter.h:1346-1357
} else if (ent.symbol == "*") {
    // 加载所有以该前缀开头的懒加载子包
    std::string prefix = ent.packageName + ".";
    for (auto& lp : lazyPackages) {
        if (lp.first.rfind(prefix, 0) == 0) {
            toLoad.push_back(lp.first);
        }
    }
    for (const auto& name : toLoad) loadLazyPackage(name);
    for (auto& kv : *pobj) env->define(kv.first, kv.second);
}
```

`import std.*` 会遍历所有 `lazyPackages` 并强制加载匹配前缀的包。但因为懒加载机制本身未被使用，这段代码实际不会触发任何懒加载。真正的问题是：它把包对象中的**所有符号**都注入当前环境，容易造成命名冲突。

#### 3. `__module__` 特殊标记是 hack

当用户写 `import json;`（单个标识符，无点号），解析器将其映射为：

```cpp
// src/AsulParser.cpp:380
ImportStmt::Entry e;
e.packageName = shorthandPkg;  // "json"
e.symbol = std::string("__module__");  // 特殊标记
```

解释器执行时检查这个特殊字符串：

```cpp
// src/AsulInterpreter.h:1339
if (ent.symbol == "__module__") {
    std::string pkg = ent.packageName;
    size_t p = pkg.rfind('.');
    std::string varName = (p == std::string::npos) ? pkg : pkg.substr(p+1);
    env->define(varName, Value{pobj});
}
```

这种用魔术字符串做分支判断的方式脆弱且不直观。如果包导出的符号恰好叫 `__module__`，会与这个机制冲突。

#### 4. 包命名空间冲突：`os` vs `std.os`

```cpp
// src/AsulPackages/AsulPackages.cpp:217-222
// os (backward compatibility alias for std.os)
{
    PackageMeta pkg;
    pkg.name = "os";
    pkg.exports = { "system", "getenv", ... };  // 与 std.os 完全相同
    packages.push_back(pkg);
}
```

`os` 和 `std.os` 是两个独立的包对象，包含相同的符号但互不关联。用户写 `import os;` 和 `import std.os;` 会得到两份独立的绑定，浪费内存且容易混淆。

#### 5. 文件导入的导出规则不直观

```cpp
// src/AsulInterpreter.h:192-201
// Rule: Import only if (Explicitly Exported) OR (Starts with Uppercase)
for (const auto& kv : fileEnv->values) {
    bool isExplicit = fileEnv->explicitExports.find(name) != fileEnv->explicitExports.end();
    bool isImplicit = !name.empty() && std::isupper(static_cast<unsigned char>(name[0]));
    if (isExplicit || isImplicit) {
        (*modObj)[name] = kv.second;
    }
}
```

- 小写开头的函数/变量**必须**用 `export` 显式导出，否则静默不可见
- 大写开头的名称**自动**导出（隐式规则，与直觉不符——类名自动导出，但同模块的工具函数不会）
- `from "file" import hiddenNotExported` 会报错 "Module has no symbol"，但错误信息不提示用户需要 `export`

#### 6. 包注册路径硬编码

`ensurePackage` 中手动维护 `stdRoot` 嵌套对象树：

```cpp
// src/AsulInterpreter.cpp:63-94
if (stdRoot && name.rfind("std.", 0) == 0) {
    std::string suffix = name.substr(4);
    auto parent = stdRoot;
    // 手动解析 "." 分隔符，逐层创建嵌套 Object
    while (pos <= suffix.size()) { ... }
}
```

包的层级关系（`std.math`、`std.io.File` 等）完全靠运行时手动构建，没有声明式配置。新增 `std.xxx` 包时需要确保 `ensurePackage` 正确创建嵌套路径，否则 `import std.xxx.*` 可能找不到符号。

#### 7. 缺少循环导入检测

`importStack` 追踪导入链用于错误报告，但**不检测循环导入**。如果 A 导入 B、B 导入 A，会导致无限递归直到栈溢出。

#### 8. 文件导入不更新 `importBaseDir`

嵌套文件导入（A 导入 B，B 导入 C）时，`importBaseDir` 保持为最初脚本的目录。如果 B 在不同目录且用相对路径导入 C，路径解析会失败。

### 包管理重构建议

| 问题 | 建议 |
|---|---|
| 懒加载未生效 | 将 `registerExternalPackages()` 改为只注册包元数据，不立即调用 `register*Package()`。实际注册延迟到首次 `import` 时 |
| `__module__` hack | 用枚举类型 `ImportKind::Module` / `ImportKind::Wildcard` / `ImportKind::Symbol` 替代魔术字符串 |
| `os` / `std.os` 重复 | 移除独立的 `os` 包，改为 `std.os` 的别名映射 |
| 导出规则不直观 | 统一为显式 `export` 导出，移除"大写自动导出"规则，或至少在文档/错误信息中明确说明 |
| 通配符导入污染 | `import pkg.*` 不注入当前环境，而是返回一个命名空间对象（如 `let std_math = import std.math.*;`） |
| 循环导入 | 在 `importFilePath` 入口检查 `importStack` 是否已包含目标路径，若包含则报错 |
| 嵌套路径解析 | 导入文件时将 `importBaseDir` 更新为被导入文件所在目录 |

---

## 性能问题

### 1. `AsulInterpreter.h` 单体头文件（~3200 行）

所有执行逻辑内联在头文件中，每个包含它的翻译单元都重新编译全部代码。`evaluate()` 和 `execute()` 各为 500+ 行的级联 `dynamic_pointer_cast` 链（67 处转换）。

### 2. 运算符重载分发重复 16 次

`__add__` ~ `__shr__` 各自重复相同的 ~15 行模式（检查实例、查找方法、绑定 `this`、调用）。应提取为 `tryOperatorOverload(l, r, magicName)` 辅助函数。

### 3. 迭代语句 3 次复制粘贴

`ForEachStmt` / `ForOfStmt` / `ForAwaitOfStmt` 包含几乎相同的数组/对象/字符串分发逻辑，仅 `ForAwaitOfStmt` 多一步 `evaluateAwait()`。

### 4. 数组方法回调样板重复 6 次

`map`/`filter`/`reduce`/`find`/`some`/`every` 各自重复 ~15 行回调调用代码。应提取为 `invokeArrayCallback` 辅助函数。

### 5. `ostringstream` 错误消息开销

39 处使用 `ostringstream` 构造简单错误消息，字符串拼接（`+`）即可。

### 6. 频繁 `make_shared<Environment>`

每次函数调用、getter/setter 访问、方法绑定都创建新 Environment。热路径可考虑环境池化。

---

## 冗余代码

| 冗余项 | 位置 | 说明 |
|---|---|---|
| 4 个 `find*` 函数 | `AsulInterpreter.h:2425-2467` | `findMethod`/`findStaticMethod`/`findGetter`/`findSetter` 仅搜索的 map 不同 |
| 3 个 `callFunction` 重载 | `AsulInterpreter.h:1999-2054` | 参数绑定逻辑相似 |
| Promise 回调分发重复 | `AsulInterpreter.h:2232-2313` | then/catch 两个分支仅遍历列表不同 |
| `getProperty` 双重检查 | `AsulInterpreter.h:2468-2515` | Instance 代理检查两次 |
| `ALangEngine.cpp` 头文件 | `ALangEngine.cpp:1-38` | 重复包含 `AsulInterpreter.h` 已传递引入的头文件 |

---

## 代码风格问题

| 问题 | 详情 |
|---|---|
| 缩进混用 | `AsulInterpreter.h` 用 tab，部分包文件用 4 空格 |
| 超长行 | 数组合成方法中 200+ 字符单行 |
| `public`/`private` 交错 | `Interpreter` 类中出现 3 次 |
| 注释语言混用 | 中英文注释共存 |
| `using namespace` 泄漏 | `ALangEngine.cpp` 中 `using namespace asul` 偶尔影响头文件 |

---

## 开发工作流

- 测试通过运行 `.alang` 示例脚本（`funcTest.sh` / `errorTest.sh`），无 C++ 测试框架
- `std.test` 包提供脚本内断言（`assert`、`assertEqual`）
- OpenSSL 可选；未链接时加密函数抛异常
- readline 可选（Unix）；Windows REPL 用 `stdin`
- CMake 自动检测 ccache 加速增量构建
