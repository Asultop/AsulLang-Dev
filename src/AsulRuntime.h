#ifndef ASUL_RUNTIME_H
#define ASUL_RUNTIME_H

#include <condition_variable>
#include <cstdlib>
#include <deque>
#include <fstream>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>

namespace asul {

// Forward declarations
struct Function;
struct PromiseState;
struct ClassInfo;
struct Instance;
struct Stmt;
struct Expr;

using StmtPtr = std::shared_ptr<Stmt>;
using ExprPtr = std::shared_ptr<Expr>;

// ----------- Value Types -----------
using Array = std::vector<struct ValueTag>;
using Object = std::unordered_map<std::string, struct ValueTag>;

// Recursive variant wrapper to allow shared_ptr recursive types.
struct ValueTag : public std::variant<std::monostate,double,std::string,bool,std::shared_ptr<Function>,std::shared_ptr<Array>,std::shared_ptr<Object>,std::shared_ptr<ClassInfo>,std::shared_ptr<Instance>,std::shared_ptr<PromiseState>> {
	using variant::variant;
};

using Value = ValueTag;

// ----------- Value Helper Functions -----------
std::string typeOf(const Value& v);
bool isTruthy(const Value& v);
std::string toString(const Value& v);
bool valueEqual(const Value& a, const Value& b);
size_t valueHash(const Value& v);

// Utility: get numeric value from Value or throw
inline double getNumber(const Value& v, const char* where) {
	if (auto n = std::get_if<double>(&v)) return *n;
	if (auto s = std::get_if<std::string>(&v)) {
		char* end = nullptr; double d = std::strtod(s->c_str(), &end); if (end && *end=='\0') return d;
	}
	throw std::runtime_error(std::string("Expected number at ") + where);
}

// Functor wrappers to use Value as key in unordered_map/set
struct ValueHash { size_t operator()(const Value& v) const noexcept { return valueHash(v); } };
struct ValueEq { bool operator()(const Value& a, const Value& b) const noexcept { return valueEqual(a, b); } };

// ----------- Native Container Types -----------
struct NativeMap { std::unordered_map<Value, Value, ValueHash, ValueEq> m; std::vector<Value> order; std::unordered_map<Value, size_t, ValueHash, ValueEq> index; };
struct NativeSet { std::unordered_set<Value, ValueHash, ValueEq> s; std::vector<Value> order; std::unordered_map<Value, size_t, ValueHash, ValueEq> index; };
struct NativeDeque { std::deque<Value> d; };
struct NativeStack { std::vector<Value> v; };

// ----------- Environment -----------
struct Environment : std::enable_shared_from_this<Environment> {
	std::shared_ptr<Environment> parent;
	std::unordered_map<std::string, Value> values;
	// declared types for variables (optional): maps variable name -> declared type name
	std::unordered_map<std::string, std::string> declaredTypes;
	// Explicitly exported symbols in this environment (for module scopes)
	std::unordered_set<std::string> explicitExports;

	explicit Environment(std::shared_ptr<Environment> p = nullptr) : parent(std::move(p)) {}

	void define(const std::string& name, const Value& val);
	// define with optional declared type
	void defineWithType(const std::string& name, const Value& val, const std::optional<std::string>& typeName);
	std::optional<std::string> getDeclaredType(const std::string& name);
	bool assign(const std::string& name, const Value& val);
	Value get(const std::string& name);
};

// ----------- Function -----------
struct Function {
	std::vector<std::string> params;
	int restParamIndex{-1}; // -1 表示没有 rest 参数，否则表示 rest 参数的索引
	std::vector<ExprPtr> defaultValues;  // 默认参数值（与 params 对应）
	std::vector<StmtPtr> body;
	std::shared_ptr<Environment> closure;
	bool isBuiltin{false};
	bool isAsync{false};
	bool isGenerator{false};
	std::function<Value(const std::vector<Value>&, std::shared_ptr<Environment>)> builtin;
};

// ----------- ClassInfo -----------
struct ClassInfo {
	std::string name;
	std::vector<std::shared_ptr<ClassInfo>> supers; // 多继承支持，按声明顺序线性查找
	std::unordered_map<std::string, std::shared_ptr<Function>> methods;
	std::unordered_map<std::string, std::shared_ptr<Function>> staticMethods;
	std::unordered_map<std::string, std::shared_ptr<Function>> getters;
	std::unordered_map<std::string, std::shared_ptr<Function>> setters;
	bool isNative{false}; // If true, new creates InstanceExt
};

// ----------- Instance -----------
struct Instance {
	std::shared_ptr<ClassInfo> klass;
	std::unordered_map<std::string, Value> fields;
	virtual ~Instance() = default;
};

// Allow Instance to own a native handle for host-wrapped classes
struct InstanceExt : Instance {
	void* nativeHandle{nullptr};
	std::function<void(void*)> nativeDestructor{nullptr};
	~InstanceExt() {
		if (nativeDestructor && nativeHandle) nativeDestructor(nativeHandle);
	}
};

// ----------- Proxy -----------
// Proxy holds a target object and a handler with traps
struct ProxyInfo {
	Value target;       // the target object
	Value handler;      // the handler object with get/set traps
};

// Support function to get value from proxy (checks handler traps)
inline Value proxyGet(const Value& proxyVal, const std::string& prop) {
	if (!std::holds_alternative<std::shared_ptr<Instance>>(proxyVal)) return Value{std::monostate{}};
	auto inst = std::get<std::shared_ptr<Instance>>(proxyVal);
	if (!inst) return Value{std::monostate{}};
	// Check if this instance is a proxy
	auto it = inst->fields.find("_target");
	if (it == inst->fields.end()) return Value{std::monostate{}};
	// Look for get trap in handler
	auto handlerIt = inst->fields.find("_handler");
	if (handlerIt == inst->fields.end()) return Value{std::monostate{}};
	auto handlerInst = std::get_if<std::shared_ptr<Instance>>(&handlerIt->second);
	if (!handlerInst || !*handlerInst) return Value{std::monostate{}};
	auto getTrapIt = (*handlerInst)->fields.find("get");
	if (getTrapIt == (*handlerInst)->fields.end()) {
		// No get trap, return direct property access
		auto targetInst = std::get_if<std::shared_ptr<Instance>>(&it->second);
		if (!targetInst || !*targetInst) return Value{std::monostate{}};
		auto propIt = (*targetInst)->fields.find(prop);
		if (propIt == (*targetInst)->fields.end()) return Value{std::monostate{}};
		return propIt->second;
	}
	// Call the get trap: get(target, prop)
	auto getTrapFn = std::get_if<std::shared_ptr<Function>>(&getTrapIt->second);
	if (!getTrapFn || !*getTrapFn) return Value{std::monostate{}};
	auto fn = *getTrapFn;
	auto local = std::make_shared<Environment>(fn->closure);
	local->define("target", it->second);
	local->define("prop", Value{prop});
	std::vector<Value> args{ it->second, Value{prop} };
	if (fn->isBuiltin) {
		return fn->builtin(args, fn->closure);
	}
	Value result = std::monostate{};
	auto prevEnv = fn->closure;
	fn->closure = local;
	try {
		execute(fn->body, local);
	} catch (const ReturnSignal& rs) {
		result = rs.value;
	}
	fn->closure = prevEnv;
	return result;
}

// Support function to set value via proxy (checks handler traps)
bool proxySet(const Value& proxyVal, const std::string& prop, const Value& newVal) {
	if (!std::holds_alternative<std::shared_ptr<Instance>>(proxyVal)) return false;
	auto inst = std::get<std::shared_ptr<Instance>>(proxyVal);
	if (!inst) return false;
	auto it = inst->fields.find("_target");
	if (it == inst->fields.end()) return false;
	auto handlerIt = inst->fields.find("_handler");
	if (handlerIt == inst->fields.end()) return false;
	auto handlerInst = std::get_if<std::shared_ptr<Instance>>(&handlerIt->second);
	if (!handlerInst || !*handlerInst) return false;
	auto setTrapIt = (*handlerInst)->fields.find("set");
	if (setTrapIt == (*handlerInst)->fields.end()) {
		// No set trap, direct property access
		auto targetInst = std::get_if<std::shared_ptr<Instance>>(&it->second);
		if (!targetInst || !*targetInst) return false;
		(*targetInst)->fields[prop] = newVal;
		return true;
	}
	// Call the set trap: set(target, prop, value) -> boolean
	auto setTrapFn = std::get_if<std::shared_ptr<Function>>(&setTrapIt->second);
	if (!setTrapFn || !*setTrapFn) return false;
	auto fn = *setTrapFn;
	auto local = std::make_shared<Environment>(fn->closure);
	local->define("target", it->second);
	local->define("prop", Value{prop});
	local->define("value", newVal);
	std::vector<Value> args{ it->second, Value{prop}, newVal };
	if (fn->isBuiltin) {
		fn->builtin(args, fn->closure);
		return true;
	}
	auto prevEnv = fn->closure;
	fn->closure = local;
	try {
		execute(fn->body, local);
	} catch (const ReturnSignal&) {}
	fn->closure = prevEnv;
	return true;
}

// ----------- Stream Wrappers -----------
struct StreamWrapper {
	virtual size_t read(char* buf, size_t n) = 0;
	virtual void write(const char* buf, size_t n) = 0;
	virtual void close() = 0;
	virtual bool eof() { return false; }
	virtual ~StreamWrapper() = default;
};

struct FStreamWrapper : StreamWrapper {
	std::fstream fs;
	FStreamWrapper(const std::string& path, std::ios_base::openmode mode) : fs(path, mode) {}
	size_t read(char* buf, size_t n) override;
	void write(const char* buf, size_t n) override;
	void close() override;
	bool eof() override;
};

struct StdinWrapper : StreamWrapper {
	size_t read(char* buf, size_t n) override;
	void write(const char* buf, size_t n) override;
	void close() override;
	bool eof() override;
};

struct StdoutWrapper : StreamWrapper {
	size_t read(char* buf, size_t n) override;
	void write(const char* buf, size_t n) override;
	void close() override;
};

struct StderrWrapper : StreamWrapper {
	size_t read(char* buf, size_t n) override;
	void write(const char* buf, size_t n) override;
	void close() override;
};

struct FilePtrWrapper : StreamWrapper {
	FILE* fp;
	std::function<void(FILE*)> closer;
	FilePtrWrapper(FILE* f, std::function<void(FILE*)> c) : fp(f), closer(c) {}
	size_t read(char* buf, size_t n) override;
	void write(const char* buf, size_t n) override;
	void close() override;
	bool eof() override;
};

// ----------- Promise State -----------
struct PromiseState {
	std::mutex mtx;
	std::condition_variable cv;
	bool settled{false};
	bool rejected{false};
	Value result{std::monostate{}};
	// 简单事件循环指针，用于 then/catch 回调分发
	void* loopPtr{nullptr};
	// then/catch 回调以及链式的下一 Promise
	std::vector<std::pair<std::shared_ptr<Function>, std::shared_ptr<PromiseState>>> thenCallbacks;
	std::vector<std::pair<std::shared_ptr<Function>, std::shared_ptr<PromiseState>>> catchCallbacks;
};

} // namespace asul

#endif // ASUL_RUNTIME_H
