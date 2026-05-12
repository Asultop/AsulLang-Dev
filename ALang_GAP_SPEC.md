# ALang 差距规格说明

## 一、文档更新

### 1.1 根目录 README.md
- [ ] 修正第759行：移除"异常处理暂不支持 finally 块"
- [ ] 补充新特性：match 模式匹配、解构赋值、@decorator 装饰器、运算符重载、yield/generator、逻辑赋值（??= &&= ||=）
- [ ] 补充完整标准库列表：std.collections, std.array, std.log, std.test, std.ffi, std.uuid, std.events, std.encoding

### 1.2 vscode-extension 文档
- [ ] 更新 FEATURES.md 至 v0.3.1
- [ ] 更新 IMPLEMENTATION-SUMMARY.md 至 v0.3.1
- [ ] 更新 SUMMARY.md 至 v0.3.1

## 二、包元数据修复

### 2.1 AsulPackages.cpp
- [ ] std.crypto: 添加 aes 对象（encrypt, decrypt）到元数据
- [ ] std.io: 添加 Stream 类到元数据
- [ ] std.os: 添加 getEnv, setEnv 到元数据导出列表

## 三、编辑器配置修复

### 3.1 language-configuration.json
- [ ] lineComment 添加 "#"
- [ ] blockComment 添加三引号格式

### 3.2 TextMate 语法
- [ ] 修复 => 箭头运算符：词法器中添加 => Token 支持

## 四、缺失语言特性实现

### 4.1 高优先级
- [ ] Promise.finally() 方法
- [ ] 尾逗号支持（数组/对象/函数参数）
- [ ] super 关键字（继承中调用父类方法）
- [ ] Getter/Setter 属性访问器
- [ ] for...of 循环语法

### 4.2 中优先级
- [ ] 数值分隔符 1_000_000
- [ ] 二进制/八进制字面量 0b1010, 0o77
- [ ] 条件 catch (catch e if condition)
- [ ] 访问控制 public/private/protected
- [ ] 反射 API（获取类方法/字段列表）

### 4.3 低优先级
- [ ] async generator + for-await-of
- [ ] 管道运算符 |>
- [ ] Proxy/Handler

## 五、缺失示例文件

- [ ] async_await_tutorial.alang
- [ ] exception_handling_complete.alang（try/catch/finally）
- [ ] match_basics.alang（模式匹配入门）
- [ ] generator_tutorial.alang（yield 详细教程）
- [ ] getter_setter_example.alang
- [ ] for_of_example.alang
- [ ] super_inheritance.alang
- [ ] promise_finally.alang
