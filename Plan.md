# ALang 优化计划

## 目标
1. 代码风格统一（内核式 C 风格）
2. 包管理 bugfix
3. 语言缺陷 bugfix

## 一、代码风格统一

### 1.1 运算符重载提取辅助函数
- **问题**：`__add__` ~ `__shr__` 16 个运算符各重复 ~15 行相同分发逻辑
- **方案**：提取 `tryOverload(l, r, magicName) -> optional<Value>` 辅助函数
- **位置**：`src/AsulInterpreter.h` evaluate() BinaryExpr 部分

### 1.2 ForEach/ForOf/ForAwaitOf 合并
- **问题**：3 个语句迭代逻辑完全相同，仅 ForAwaitOf 多一步 await
- **方案**：提取 `iterateIterable(iterable, varName, body, env, awaitEach)` 辅助函数
- **位置**：`src/AsulInterpreter.h` execute() 1447-1608 行

### 1.3 数组方法回调提取
- **问题**：map/filter/reduce/find/some/every 各重复 ~15 行回调调用样板
- **方案**：提取 `invokeArrayCallback(cb, elem, index, array) -> Value`
- **位置**：`src/AsulInterpreter.h` getProperty() 数组方法部分

### 1.4 find* 函数模板化
- **问题**：findMethod/findStaticMethod/findGetter/findSetter 仅搜索的 map 不同
- **方案**：合并为 `findInHierarchy(k, name, mapAccessor)`
- **位置**：`src/AsulInterpreter.h` 2425-2467 行

### 1.5 public/private 段整理
- **问题**：public/private 交错 3 次
- **方案**：重新组织为 public -> private 两段

## 二、包管理 Bugfix

### 2.1 用枚举替代 `__module__` 魔术字符串
- **文件**：`src/AsulAst.h`、`src/AsulParser.cpp`、`src/AsulInterpreter.h`

### 2.2 添加循环导入检测
- **文件**：`src/AsulInterpreter.h` importFilePath()

### 2.3 嵌套文件导入更新 importBaseDir
- **文件**：`src/AsulInterpreter.h` importFilePath()

### 2.4 文件导入导出错误提示增强
- **文件**：`src/AsulInterpreter.h` importFilePath()

## 三、语言缺陷 Bugfix

### 3.1 二元运算符 switch break 审查
- **文件**：`src/AsulInterpreter.h` evaluate() BinaryExpr

### 3.2 dispatchPromiseCallbacks 重复代码合并
- **文件**：`src/AsulInterpreter.h`

### 3.3 getProperty 双重 Instance 检查合并
- **文件**：`src/AsulInterpreter.h`

### 3.4 callFunction 3 个重载去重
- **文件**：`src/AsulInterpreter.h`
