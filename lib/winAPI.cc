#include <stdio.h>
#include <windows.h>
#include <tlhelp32.h>

#include <node_api.h>

void raiseErr(napi_env env, char* errCode, napi_value* err, napi_value* result) {
	sprintf(errCode, "ERROR: Windows API %d", GetLastError());
	napi_create_string_utf8(env, errCode, NAPI_AUTO_LENGTH, err);
	napi_set_named_property(env, *result, "error", *err);
}

napi_value GetProcessList(napi_env env, napi_callback_info info) {

	char helper[100]; //convert DWORD to string
	napi_value result;
	napi_value procArr;
	napi_value procVal;
	napi_value procPID;
	napi_value procImage;
	napi_value err;
	napi_value nNull;
	napi_value debug;

	napi_get_null(env, &nNull);
	napi_create_object(env, &result);
	napi_create_array(env, &procArr);

	napi_set_named_property(env, result, "processes", nNull);
	napi_set_named_property(env, result, "error", nNull);


	HANDLE handle = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (handle == 0) {
		raiseErr(env, helper, &err, &result);
		return result;
	}

	PROCESSENTRY32 entry;
	entry.dwSize = sizeof(PROCESSENTRY32);
	if (Process32First(handle, &entry) == 0) {
		raiseErr(env, helper, &err, &result);
		return result;
	}

	for (int i = 0; i < 10000; i++) {
		sprintf(helper, "%d", entry.th32ProcessID);
		napi_create_string_utf8(env, helper, NAPI_AUTO_LENGTH, &procPID);
		napi_create_string_utf8(env, entry.szExeFile, NAPI_AUTO_LENGTH, &procImage);

		napi_create_array(env, &procVal);
		napi_set_element(env, procVal, 0, procPID);
		napi_set_element(env, procVal, 1, procImage);

		napi_set_element(env, procArr, i, procVal);

		//napi_throw(env, procVal);
		if (Process32Next(handle, &entry) == 0) {
			break;
		}
		//napi_create_string_utf8(env, entry.szExeFile, NAPI_AUTO_LENGTH, &debug);
		//napi_throw(env, procVal);
	}
	CloseHandle(handle);

	napi_set_named_property(env, result, "processes", procArr);

	return result;
}

int winFound = 0;
BOOL CALLBACK enumWindowCb(HWND hwnd, LPARAM lparam) {
	DWORD lpdwProcessId;
	GetWindowThreadProcessId(hwnd, &lpdwProcessId);
	//printf("%i %i\n", lpdwProcessId, lparam);
	if (lpdwProcessId == lparam)
	{
		winFound = 1;
		PostMessage(hwnd, WM_CLOSE, NULL, NULL);
		PostMessage(hwnd, WM_QUIT, NULL, NULL);
	}
	return TRUE;
}

napi_value KillProcessByPID_hard(napi_env env, napi_callback_info info) {
	char helper[100]; //convert DWORD to string
	napi_value result;
	napi_value st;
	napi_value nNull;
	size_t argc = 1;
	napi_value args[1];
	int PID;

	napi_get_cb_info(env, info, &argc, args, NULL, NULL);
	napi_get_value_int32(env, args[0], &PID);

	napi_get_null(env, &nNull);
	napi_create_object(env, &result);

	napi_set_named_property(env, result, "result", nNull);
	napi_set_named_property(env, result, "error", nNull);


	HANDLE handle = OpenProcess(PROCESS_TERMINATE, false, PID);
	if (handle == 0) {
		raiseErr(env, helper, &st, &result);
		return result;
	}
	if (TerminateProcess(handle, 0xDEAD) == 0) {
		raiseErr(env, helper, &st, &result);
		return result;
	}

	CloseHandle(handle);

	sprintf(helper, "SUCCESS: The process with PID %d has been terminated", PID);
	napi_create_string_utf8(env, helper, NAPI_AUTO_LENGTH, &st);
	napi_set_named_property(env, result, "result", st);

	return result;
}

napi_value KillProcessByPID_soft(napi_env env, napi_callback_info info) {
	char helper[100]; //convert DWORD to string
	napi_value result;
	napi_value st;
	napi_value nNull;
	size_t argc = 1;
	napi_value args[1];
	int PID;

	napi_get_cb_info(env, info, &argc, args, NULL, NULL);
	napi_get_value_int32(env, args[0], &PID);

	napi_get_null(env, &nNull);
	napi_create_object(env, &result);

	napi_set_named_property(env, result, "result", nNull);
	napi_set_named_property(env, result, "error", nNull);
	winFound = 0;
	if (EnumWindows(enumWindowCb, PID) == 0) {
		raiseErr(env, helper, &st, &result);
		return result;
	}
	if (winFound) {
		napi_create_string_utf8(env, "SUCCESS: WM_CLOSE, WM_QUIT sent", NAPI_AUTO_LENGTH, &st);
		napi_set_named_property(env, result, "result", st);
	}
	else {
		HANDLE handle = OpenProcess(PROCESS_TERMINATE, false, PID);
		if (handle == 0) {
			raiseErr(env, helper, &st, &result);
			return result;
		}
		if (TerminateProcess(handle, 0xDEAD) == 0) {
			raiseErr(env, helper, &st, &result);
			return result;
		}
		CloseHandle(handle);
		sprintf(helper, "SUCCESS: The process with PID %d has been terminated", PID);
		napi_create_string_utf8(env, helper, NAPI_AUTO_LENGTH, &st);
		napi_set_named_property(env, result, "result", st);
	}

	return result;
}

napi_value IsProcessRunning(napi_env env, napi_callback_info info) {
	char helper[100]; //convert DWORD to string
	napi_value result;
	napi_value st;
	napi_value nTrue;
	napi_value nFalse;
	napi_value nNull;
	size_t argc = 1;
	napi_value args[1];
	int PID;

	napi_get_cb_info(env, info, &argc, args, NULL, NULL);
	napi_get_value_int32(env, args[0], &PID);

	napi_get_null(env, &nNull);
	napi_get_boolean(env, true, &nTrue);
	napi_get_boolean(env, false, &nFalse);
	napi_create_object(env, &result);

	napi_set_named_property(env, result, "result", nNull);
	napi_set_named_property(env, result, "error", nNull);

	HANDLE handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, PID);
	if (handle == 0) {
		raiseErr(env, helper, &st, &result);
		return result;
	}
	
	DWORD dwResult = 0;
	if (GetExitCodeProcess(handle,&dwResult) == 0) {
		DWORD errCode = GetLastError();
		if (errCode != 87){
			sprintf(helper, "ERROR: Windows API %d", GetLastError());
			napi_create_string_utf8(env, helper, NAPI_AUTO_LENGTH, &st);
			napi_set_named_property(env, result, "error", st);
		}
		//raiseErr(env, helper, &st, &result);
		//return result;
	}
	CloseHandle(handle);

	if (dwResult == STILL_ACTIVE) {
		napi_set_named_property(env, result, "result", nTrue);
	}
	else {
		napi_set_named_property(env, result, "result", nFalse);
	}

	return result;
}

napi_value init(napi_env env, napi_value exports) {
	//napi_value result;

	//napi_create_function(env, nullptr, 0, GetProcessList, nullptr, &result);

	//return result;

	napi_status status;
	napi_property_attributes attr = (napi_property_attributes)(napi_writable | napi_enumerable | napi_configurable);
	napi_property_descriptor desc = {
		"getProcessList", NULL,
		GetProcessList, NULL, NULL, NULL,
		attr,
		NULL
	};
	status = napi_define_properties(env, exports, 1, &desc);
	if (status != napi_ok) return NULL;

	desc = {
		"killProcByPID", NULL,
		KillProcessByPID_soft, NULL, NULL, NULL,
		attr,
		NULL
	};
	status = napi_define_properties(env, exports, 1, &desc);
	if (status != napi_ok) return NULL;

	desc = {
	"forceKillProcByPID", NULL,
	KillProcessByPID_hard, NULL, NULL, NULL,
	attr,
	NULL
	};
	status = napi_define_properties(env, exports, 1, &desc);
	if (status != napi_ok) return NULL;

	desc = {
	"isProcRunning", NULL,
	IsProcessRunning, NULL, NULL, NULL,
	attr,
	NULL
	};
	status = napi_define_properties(env, exports, 1, &desc);
	if (status != napi_ok) return NULL;
	
	return exports;

}



NAPI_MODULE(NODE_GYP_MODULE_NAME, init)