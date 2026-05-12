# ALang 差距规格说明

## 一、文档更新

### 1.1 根目录 README.md
- [x] 修正第759行：移除"异常处理暂不支持 finally 块"
- [x] 补充新特性：match 模式匹配、解构赋值、@decorator 装饰器、运算符重载、yield/generator、逻辑赋值（??= &&= ||=）
- [x] 补充完整标准库列表：std.collections, std.array, std.log, std.test, std.ffi, std.uuid, std.events, std.encoding

### 1.2 vscode-extension 文档
- [x] 更新 FEATURES.md 至 v0.3.1
- [x] 更新 IMPLEMENTATION-SUMMARY.md 至 v0.3.1
- [x] 更新 SUMMARY.md 至 v0.3.1

## 二、包元数据修复

### 2.1 AsulPackages.cpp
- [x] std.crypto: 添加 aes 对象（encrypt, decrypt）到元数据
- [x] std.io: 添加 Stream 类到元数据
- [x] std.os: 添加 getEnv, setEnv 到元数据导出列表

## 三、编辑器配置修复

### 3.1 language-configuration.json
- [x] lineComment 添加 "#"
- [x] blockComment 添加三引号格式 `"""..."""` / `'''...'''`

### 3.2 TextMate 语法
- [x] 修复 => 箭头运算符：词法器中添加 => Token 支持

## 四、缺失语言特性实现

### 4.1 高优先级
- [x] Promise.finally() 方法
- [x] 尾逗号支持（数组/对象/函数参数）
- [x] super 关键字（继承中调用父类方法）
- [x] Getter/Setter 属性访问器
- [x] for...of 循环语法

### 4.2 中优先级
- [x] 数值分隔符 1_000_000
- [x] 二进制/八进制字面量 0b1010, 0o77
- [x] 条件 catch (catch e if condition)
- [x] 访问控制 public/private/protected
- [x] 反射 API（获取类方法/字段列表）

### 4.3 低优先级
- [ ] async generator + for-await-of
- [ ] 管道运算符 |>
- [ ] Proxy/Handler

## 五、缺失示例文件

- [x] async_await_tutorial.alang
- [x] exception_handling_complete.alang
- [x] match_basics.alang
- [x] generator_tutorial.alang
- [x] getter_setter_example.alang
- [x] for_of_example.alang
- [x] super_inheritance.alang
- [x] promise_finally.alang
