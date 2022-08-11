
#include <node_api.h>

#ifdef __APPLE__

#include <assert.h>
#include <errno.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/sysctl.h>

typedef struct kinfo_proc kinfo_proc;

static int GetBSDProcessList(kinfo_proc **procList, size_t *procCount)
    // Returns a list of all BSD processes on the system.  This routine
    // allocates the list and puts it in *procList and a count of the
    // number of entries in *procCount.  You are responsible for freeing
    // this list (use "free" from System framework).
    // On success, the function returns 0.
    // On error, the function returns a BSD errno value.
{
    int                 err;
    kinfo_proc *        result;
    bool                done;
    static const int    name[] = { CTL_KERN, KERN_PROC, KERN_PROC_ALL, 0 };
    // Declaring name as const requires us to cast it when passing it to
    // sysctl because the prototype doesn't include the const modifier.
    size_t              length;

    assert( procList != NULL);
    //assert(*procList == NULL);
    assert(procCount != NULL);

    *procCount = 0;

    // We start by calling sysctl with result == NULL and length == 0.
    // That will succeed, and set length to the appropriate length.
    // We then allocate a buffer of that size and call sysctl again
    // with that buffer.  If that succeeds, we're done.  If that fails
    // with ENOMEM, we have to throw away our buffer and loop.  Note
    // that the loop causes use to call sysctl with NULL again; this
    // is necessary because the ENOMEM failure case sets length to
    // the amount of data returned, not the amount of data that
    // could have been returned.

    result = NULL;
    done = false;
    do {
        assert(result == NULL);

        // Call sysctl with a NULL buffer.

        length = 0;
        err = sysctl( (int *) name, (sizeof(name) / sizeof(*name)) - 1,
                      NULL, &length,
                      NULL, 0);
        if (err == -1) {
            err = errno;
        }

        // Allocate an appropriately sized buffer based on the results
        // from the previous call.

        if (err == 0) {
            result = (kinfo_proc*) malloc(length);
            if (result == NULL) {
                err = ENOMEM;
            }
        }

        // Call sysctl again with the new buffer.  If we get an ENOMEM
        // error, toss away our buffer and start again.

        if (err == 0) {
            err = sysctl( (int *) name, (sizeof(name) / sizeof(*name)) - 1,
                          result, &length,
                          NULL, 0);
            if (err == -1) {
                err = errno;
            }
            if (err == 0) {
                done = true;
            } else if (err == ENOMEM) {
                assert(result != NULL);
                free(result);
                result = NULL;
                err = 0;
            }
        }
    } while (err == 0 && ! done);

    // Clean up and establish post conditions.

    if (err != 0 && result != NULL) {
        free(result);
        result = NULL;
    }
    *procList = result;
    if (err == 0) {
        *procCount = length / sizeof(kinfo_proc);
    }

    assert( (err == 0) == (*procList != NULL) );

    return err;
}

void raiseErr(napi_env env, int errcode, char* helper, napi_value *err, napi_value* result){
    sprintf(helper, "ERROR: Sysctl %d", errcode);
    napi_create_string_utf8(env,helper,NAPI_AUTO_LENGTH,err);
    napi_set_named_property(env, *result, "error", *err);
}

napi_value GetProcessList(napi_env env, napi_callback_info info) {
  char helper[30];
  napi_value result;
  napi_value procArr;
  napi_value procVal;
  napi_value procPID;
  napi_value procImage;
  napi_value err;
  napi_value nNull;

  napi_get_null(env, &nNull);
  napi_create_object(env, &result);
  napi_create_array(env, &procArr);

  napi_set_named_property(env, result, "processes", nNull);
  napi_set_named_property(env, result, "error", nNull);

  kinfo_proc *procs;
  size_t count;
  int errcode = GetBSDProcessList(&procs, &count);
  if (errcode) {
    raiseErr(env, errcode, helper, &err, &result);
    return result;
  };
  //FILE *f = fopen("./bsdlist", "w");
  for (size_t i=0; i!=count; ++i) {
    sprintf(helper, "%d", procs[i].kp_proc.p_pid);
    napi_create_string_utf8(env, helper, NAPI_AUTO_LENGTH, &procPID);
    napi_create_string_utf8(env, procs[i].kp_proc.p_comm, NAPI_AUTO_LENGTH, &procImage);

    napi_create_array(env, &procVal);
    napi_set_element(env, procVal, 0, procPID);
    napi_set_element(env, procVal, 1, procImage);

    napi_set_element(env, procArr, i, procVal);
    //printf("%d %s\n", procs[i].kp_proc.p_pid, procs[i].kp_proc.p_comm);
  }
  free(procs);

  napi_set_named_property(env,result,"processes",procArr);

  return result; 
}

napi_value init(napi_env env, napi_value exports) {
    napi_value result;

    napi_create_function(env, nullptr, 0, GetProcessList, nullptr, &result);

    return result;
}

#else

napi_value init(napi_env env, napi_value exports) {
    return exports;
}

#endif

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
