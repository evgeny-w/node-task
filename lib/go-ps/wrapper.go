package main


/*
#include <stdlib.h>
struct process {
  int pid;
  char* executable;
};
*/
import "C"

import ("ps")

import ("unsafe")

type process = ps.Process

var ptrhold[10000] unsafe.Pointer;
var ptridx int = 0;

//export getProcess
func getProcess(size int, start_ptr unsafe.Pointer) int {
  
  p, _ := ps.Processes();
  i := 0;
  for _, p1 := range p {
    if (i>=size) {
      break;
    }
    cptr := (*C.struct_process) (unsafe.Add(start_ptr,16*i));
    cptr.pid = C.int(p1.Pid());
    cptr.executable = C.CString(p1.Executable()); 
    ptrhold[ptridx] = unsafe.Pointer(cptr.executable);
    ptridx += 1;
    i++;
	}
  
  return i;
}

//export Free
func Free(){
  for i := 0; i<ptridx; i++{
    C.free(ptrhold[i])
  }
  ptridx = 0;
}

func main(){
}
