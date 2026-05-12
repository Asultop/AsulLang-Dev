#include "StdOs.h"
#include "../../../AsulInterpreter.h"
#include <cstdlib>
#include <csignal>
#include <filesystem>
#include <thread>

#ifdef _WIN32
    #include <windows.h>
    #include <process.h>
    #define getpid _getpid
    #define popen _popen
    #define pclose _pclose
    inline int setenv(const char* name, const char* value, int overwrite) {
        return _putenv_s(name, value);
    }
#else
    #include <unistd.h>
    #include <signal.h>
    #include <sys/wait.h>
#endif

namespace asul {

void registerStdOsPackage(Interpreter& interp) {
	Interpreter* interpPtr = &interp;
	interp.registerLazyPackage("std.os", [interpPtr](std::shared_ptr<Object> osPkg) {
		// system(command)
		auto systemFn = std::make_shared<Function>(); systemFn->isBuiltin = true;
		systemFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.empty()) throw std::runtime_error("os.system 需要命令参数");
			std::string cmd = toString(args[0]);
			int ret = std::system(cmd.c_str());
			return Value{static_cast<double>(ret)};
		};
		(*osPkg)["system"] = Value{systemFn};

		// getenv(name)
		auto getenvFn = std::make_shared<Function>(); getenvFn->isBuiltin = true;
		getenvFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.empty()) throw std::runtime_error("os.getenv 需要环境变量名参数");
			std::string name = toString(args[0]);
			const char* val = std::getenv(name.c_str());
			if (val) return Value{std::string(val)};
			return Value{std::monostate{}};
		};
		(*osPkg)["getenv"] = Value{getenvFn};
		// Alias: getEnv
		(*osPkg)["getEnv"] = Value{getenvFn};

		// setenv(name, value)
		auto setenvFn = std::make_shared<Function>(); setenvFn->isBuiltin = true;
		setenvFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.size() < 2) throw std::runtime_error("os.setenv 需要环境变量名和值两个参数");
			std::string name = toString(args[0]);
			std::string val = toString(args[1]);
			setenv(name.c_str(), val.c_str(), 1);
			return Value{true};
		};
		(*osPkg)["setenv"] = Value{setenvFn};
		// Alias: setEnv
		(*osPkg)["setEnv"] = Value{setenvFn};

		// signal(signame, callback)
		auto signalFn = std::make_shared<Function>(); signalFn->isBuiltin = true;
		signalFn->builtin = [interpPtr](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.size() != 2) throw std::runtime_error("os.signal 需要信号名和回调函数两个参数");
			std::string signame = toString(args[0]);
			Value callback = args[1];
			if (!std::holds_alternative<std::shared_ptr<Function>>(callback)) throw std::runtime_error("os.signal 的回调参数必须是函数");

			int sig = 0;
			if (signame == "SIGINT") sig = SIGINT;
			else if (signame == "SIGTERM") sig = SIGTERM;
#ifndef _WIN32
			else if (signame == "SIGKILL") sig = SIGKILL;
			else if (signame == "SIGUSR1") sig = SIGUSR1;
			else if (signame == "SIGUSR2") sig = SIGUSR2;
#endif
			else throw std::runtime_error("os.signal 不支持的信号: " + signame);

			interpPtr->setSignalHandler(sig, callback);
			std::signal(sig, globalSignalHandler);
			return Value{true};
		};
		(*osPkg)["signal"] = Value{signalFn};

		// kill(pid, signame) - send signal to process
		auto killFn = std::make_shared<Function>(); killFn->isBuiltin = true;
		killFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.size() < 2) throw std::runtime_error("os.kill 需要进程ID和信号名两个参数");
			int pid = static_cast<int>(Interpreter::getNumber(args[0], "os.kill pid"));
			std::string signame = toString(args[1]);

			int sig = 0;
			if (signame == "SIGINT") sig = SIGINT;
			else if (signame == "SIGTERM") sig = SIGTERM;
#ifndef _WIN32
			else if (signame == "SIGKILL") sig = SIGKILL;
			else if (signame == "SIGUSR1") sig = SIGUSR1;
			else if (signame == "SIGUSR2") sig = SIGUSR2;
#endif
			else throw std::runtime_error("os.kill 不支持的信号: " + signame);

#ifdef _WIN32
			if (pid == _getpid()) {
				raise(sig);
				return Value{true};
			} else {
				if (sig == SIGINT) {
					BOOL result = GenerateConsoleCtrlEvent(CTRL_C_EVENT, 0);
					return Value{result != 0};
				} else {
					HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
					if (hProcess) {
						BOOL result = TerminateProcess(hProcess, 1);
						CloseHandle(hProcess);
						return Value{result != 0};
					}
					return Value{false};
				}
			}
#else
			int result = kill(pid, sig);
			return Value{result == 0};
#endif
		};
		(*osPkg)["kill"] = Value{killFn};

		// raise(signame) - send signal to self
		auto raiseFn = std::make_shared<Function>(); raiseFn->isBuiltin = true;
		raiseFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.empty()) throw std::runtime_error("os.raise 需要信号名参数");
			std::string signame = toString(args[0]);

			int sig = 0;
			if (signame == "SIGINT") sig = SIGINT;
			else if (signame == "SIGTERM") sig = SIGTERM;
#ifndef _WIN32
			else if (signame == "SIGUSR1") sig = SIGUSR1;
			else if (signame == "SIGUSR2") sig = SIGUSR2;
#endif
			else throw std::runtime_error("os.raise 不支持的信号: " + signame);

			int result = raise(sig);
			return Value{result == 0};
		};
		(*osPkg)["raise"] = Value{raiseFn};

		// getpid()
		auto getpidFn = std::make_shared<Function>(); getpidFn->isBuiltin = true;
		getpidFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			return Value{static_cast<double>(getpid())};
		};
		(*osPkg)["getpid"] = Value{getpidFn};

		// popen(command, mode)
		auto popenFn = std::make_shared<Function>(); popenFn->isBuiltin = true;
		popenFn->builtin = [interpPtr](const std::vector<Value>& args, std::shared_ptr<Environment> closure)->Value {
			if (args.size() < 1) throw std::runtime_error("os.popen 需要命令参数");
			std::string cmd = toString(args[0]);
			std::string mode = "r";
			if (args.size() > 1) mode = toString(args[1]);

			FILE* fp = popen(cmd.c_str(), mode.c_str());
			if (!fp) throw std::runtime_error("os.popen 执行失败");

			auto ioPkgLocal = interpPtr->ensurePackage("std.io");
			auto itFS = ioPkgLocal->find("FileStream");
			if (itFS == ioPkgLocal->end() || !std::holds_alternative<std::shared_ptr<ClassInfo>>(itFS->second)) {
				pclose(fp);
				throw std::runtime_error("未找到 FileStream 类");
			}
			auto streamClass = std::get<std::shared_ptr<ClassInfo>>(itFS->second);

			auto fsInst = std::make_shared<InstanceExt>();
			fsInst->klass = streamClass;
			fsInst->fields["path"] = Value{cmd};
			fsInst->fields["mode"] = Value{mode};
			fsInst->fields["closed"] = Value{false};

			fsInst->nativeHandle = new FilePtrWrapper(fp, [](FILE* f) { pclose(f); });
			fsInst->nativeDestructor = [](void* ptr) { delete static_cast<StreamWrapper*>(ptr); };

			return Value{std::shared_ptr<Instance>(fsInst)};
		};
		(*osPkg)["popen"] = Value{popenFn};

		// call(program, args?, cwd?) - run external process, return Promise
		auto callFn = std::make_shared<Function>(); callFn->isBuiltin = true;
		callFn->builtin = [interpPtr](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			if (args.size() < 1) throw std::runtime_error("os.call expects at least 1 argument (program)");
			if (!std::holds_alternative<std::string>(args[0])) throw std::runtime_error("os.call: program must be a string");
			std::string prog = std::get<std::string>(args[0]);
			std::vector<std::string> argv;
			if (args.size() >= 2 && !std::holds_alternative<std::monostate>(args[1])) {
				if (auto parr = std::get_if<std::shared_ptr<Array>>(&args[1])) {
					auto a = *parr; if (a) for (auto &v : *a) { if (!std::holds_alternative<std::string>(v)) throw std::runtime_error("os.call: args must be array of strings"); argv.push_back(std::get<std::string>(v)); }
				} else if (std::holds_alternative<std::string>(args[1])) {
					argv.push_back(std::get<std::string>(args[1]));
				} else {
					throw std::runtime_error("os.call: second argument must be array of strings or a string");
				}
			}
			std::string cwd;
			if (args.size() >= 3 && std::holds_alternative<std::string>(args[2])) cwd = std::get<std::string>(args[2]);
			auto p = std::make_shared<PromiseState>(); p->loopPtr = interpPtr;
#ifdef _WIN32
			std::thread([p, interpPtr, prog, argv, cwd]() {
				bool isShellCmd = (prog == "echo" || prog == "dir" || prog == "type" ||
								   prog == "del" || prog == "copy" || prog == "move" ||
								   prog == "ver" || prog == "whoami" || prog == "set" ||
								   prog == "cmd");

				std::string cmdLine;
				if (isShellCmd) {
					cmdLine = "cmd /c " + prog;
				} else {
					cmdLine = prog;
				}

				for (const auto& arg : argv) {
					cmdLine += " \"" + arg + "\"";
				}

				SECURITY_ATTRIBUTES saAttr;
				saAttr.nLength = sizeof(SECURITY_ATTRIBUTES);
				saAttr.bInheritHandle = TRUE;
				saAttr.lpSecurityDescriptor = NULL;

				HANDLE hStdOutRead, hStdOutWrite;
				HANDLE hStdErrRead, hStdErrWrite;

				if (!CreatePipe(&hStdOutRead, &hStdOutWrite, &saAttr, 0) ||
					!CreatePipe(&hStdErrRead, &hStdErrWrite, &saAttr, 0)) {
					interpPtr->settlePromise(p, true, Value{ std::string("os.call: CreatePipe failed") });
					return;
				}

				SetHandleInformation(hStdOutRead, HANDLE_FLAG_INHERIT, 0);
				SetHandleInformation(hStdErrRead, HANDLE_FLAG_INHERIT, 0);

				STARTUPINFOA si;
				PROCESS_INFORMATION pi;
				ZeroMemory(&si, sizeof(si));
				si.cb = sizeof(si);
				si.hStdOutput = hStdOutWrite;
				si.hStdError = hStdErrWrite;
				si.dwFlags |= STARTF_USESTDHANDLES;
				ZeroMemory(&pi, sizeof(pi));

				BOOL success = CreateProcessA(
					NULL,
					const_cast<char*>(cmdLine.c_str()),
					NULL, NULL, TRUE, 0, NULL,
					cwd.empty() ? NULL : cwd.c_str(),
					&si, &pi
				);

				CloseHandle(hStdOutWrite);
				CloseHandle(hStdErrWrite);

				if (!success) {
					CloseHandle(hStdOutRead);
					CloseHandle(hStdErrRead);
					interpPtr->settlePromise(p, true, Value{ std::string("os.call: CreateProcess failed") });
					return;
				}

				std::string out, err;
				char buffer[4096];
				DWORD bytesRead;

				std::thread readOut([&]() {
					while (ReadFile(hStdOutRead, buffer, sizeof(buffer), &bytesRead, NULL) && bytesRead > 0) {
						out.append(buffer, bytesRead);
					}
				});

				std::thread readErr([&]() {
					while (ReadFile(hStdErrRead, buffer, sizeof(buffer), &bytesRead, NULL) && bytesRead > 0) {
						err.append(buffer, bytesRead);
					}
				});

				WaitForSingleObject(pi.hProcess, INFINITE);

				DWORD exitCode;
				GetExitCodeProcess(pi.hProcess, &exitCode);

				readOut.join();
				readErr.join();

				CloseHandle(hStdOutRead);
				CloseHandle(hStdErrRead);
				CloseHandle(pi.hProcess);
				CloseHandle(pi.hThread);

				auto res = std::make_shared<Object>();
				(*res)["exitCode"] = Value{ static_cast<double>(exitCode) };
				(*res)["stdout"] = Value{ out };
				(*res)["stderr"] = Value{ err };
				interpPtr->settlePromise(p, false, Value{ res });
			}).detach();
#else
			std::thread([p, interpPtr, prog, argv, cwd]() {
				int outpipe[2]; int errpipe[2];
				if (pipe(outpipe) != 0 || pipe(errpipe) != 0) {
					interpPtr->settlePromise(p, true, Value{ std::string("os.call: pipe failed") });
					return;
				}
				pid_t pid = fork();
				if (pid == 0) {
					if (!cwd.empty()) {
						auto ret = chdir(cwd.c_str());
						ret = ret;
					}
					dup2(outpipe[1], STDOUT_FILENO);
					dup2(errpipe[1], STDERR_FILENO);
					close(outpipe[0]); close(outpipe[1]); close(errpipe[0]); close(errpipe[1]);
					std::vector<char*> cargv;
					cargv.reserve(argv.size() + 2);
					cargv.push_back(const_cast<char*>(prog.c_str()));
					for (auto &s : argv) cargv.push_back(const_cast<char*>(s.c_str()));
					cargv.push_back(nullptr);
					execvp(prog.c_str(), cargv.data());
					_exit(127);
				} else if (pid > 0) {
					close(outpipe[1]); close(errpipe[1]);
					std::string out; std::string err;
					std::thread rout([&]{ char buf[4096]; ssize_t r; while((r = read(outpipe[0], buf, sizeof(buf))) > 0) out.append(buf, (size_t)r); close(outpipe[0]); });
					std::thread rerr([&]{ char buf[4096]; ssize_t r; while((r = read(errpipe[0], buf, sizeof(buf))) > 0) err.append(buf, (size_t)r); close(errpipe[0]); });
					int status = 0; waitpid(pid, &status, 0);
					rout.join(); rerr.join();
					int exitCode = (WIFEXITED(status) ? WEXITSTATUS(status) : -1);
					auto res = std::make_shared<Object>();
					(*res)["exitCode"] = Value{ static_cast<double>(exitCode) };
					(*res)["stdout"] = Value{ out };
					(*res)["stderr"] = Value{ err };
					interpPtr->settlePromise(p, false, Value{ res });
				} else {
					close(outpipe[0]); close(outpipe[1]); close(errpipe[0]); close(errpipe[1]);
					interpPtr->settlePromise(p, true, Value{ std::string("os.call: fork failed") });
				}
			}).detach();
#endif
			return Value{ p };
		};
		(*osPkg)["call"] = Value{ callFn };

		// exit(code)
		auto exitFn = std::make_shared<Function>(); exitFn->isBuiltin = true;
		exitFn->builtin = [](const std::vector<Value>& args, std::shared_ptr<Environment>)->Value {
			int code = 0;
			if (!args.empty()) code = static_cast<int>(Interpreter::getNumber(args[0], "exit code"));
			std::exit(code);
			return Value{std::monostate{}};
		};
		(*osPkg)["exit"] = Value{exitFn};

		// arch()
		auto archFn = std::make_shared<Function>(); archFn->isBuiltin = true;
		archFn->builtin = [](const std::vector<Value>&, std::shared_ptr<Environment>)->Value {
			if(sizeof(void*) == 8) return Value{std::string("x64")};
			return Value{std::string("x86")};
		};
		(*osPkg)["arch"] = Value{archFn};

		// platform()
		auto platformFn = std::make_shared<Function>(); platformFn->isBuiltin = true;
		platformFn->builtin = [](const std::vector<Value>&, std::shared_ptr<Environment>)->Value {
			#ifdef _WIN32
			return Value{std::string("windows")};
			#elif __linux__
			return Value{std::string("linux")};
			#elif __APPLE__
			return Value{std::string("darwin")};
			#else
			return Value{std::string("unknown")};
			#endif
		};
		(*osPkg)["platform"] = Value{platformFn};
	});

	// Backward compatibility: register as "os" so `import os` still works
	interp.registerLazyPackage("os", [interpPtr](std::shared_ptr<Object> osPkg) {
		interpPtr->loadLazyPackage("std.os");
		auto stdOs = interpPtr->ensurePackage("std.os");
		for (auto& kv : *stdOs) {
			(*osPkg)[kv.first] = kv.second;
		}
	});
}

PackageMeta getStdOsPackageMeta() {
    PackageMeta pkg;
    pkg.name = "std.os";
    pkg.exports = { "system", "getenv", "setenv", "signal", "kill", "raise", "getpid", "popen", "platform", "call", "exit", "arch" };
    return pkg;
}

} // namespace asul
