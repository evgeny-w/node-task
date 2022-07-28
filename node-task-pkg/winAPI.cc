
#include <node.h>
#include <node_api.h>
#include <windows.h>
#include <tlhelp32.h>


napi_value FindPrimes(napi_env env, napi_callback_info info) {
	size_t argc = 1;
	napi_value args[1];
	int64_t upper_limit;
	int64_t largest_prime;
	napi_value output;

	napi_get_cb_info(env, info, &argc, args, NULL, NULL);

	napi_get_value_int64(env, args[0], &upper_limit);

	largest_prime = upper_limit;

	napi_create_double(env, largest_prime, &output);

	return output;
}

void raiseErr(napi_env env, char* errCode, napi_value* err, napi_value* result) {
	sprintf(errCode, "ERROR: Windows API %d", GetLastError());
	napi_create_string_utf8(env, errCode, NAPI_AUTO_LENGTH, err);
	napi_set_named_property(env, *result, "error", *err);
}

napi_value GetProcessList(napi_env env, napi_callback_info info) {

	char helper[30]; //convert DWORD to string
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

napi_value init(napi_env env, napi_value exports) {
	napi_value result;

	napi_create_function(env, nullptr, 0, GetProcessList, nullptr, &result);

	return result;
}



NAPI_MODULE(NODE_GYP_MODULE_NAME, init)