export type ReviewSessionState<T> = {data:T|null;newer:T|null;error:unknown;loading:boolean};
/** Detail polling preserves reviewed evidence and bounds even non-cooperative requests. */
export function createReviewSession<T extends {revision:string}>(
 load:(signal:AbortSignal)=>Promise<T>,
 update:(state:ReviewSessionState<T>)=>void,
 timers:Pick<typeof globalThis,'setTimeout'|'clearTimeout'>=globalThis,
 timeoutMs=20000,
) {
 let state:ReviewSessionState<T>={data:null,newer:null,error:null,loading:false};
 let disposed=false,active:AbortController|null=null;
 const publish=()=>{if(!disposed)update({...state});};
 const refresh=async(acceptSaved=false):Promise<boolean>=>{
  if(disposed||state.loading&&!acceptSaved)return false;
  if(acceptSaved)active?.abort();
  state={...state,loading:true,error:null};publish();
  const controller=new AbortController();active=controller;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const cancelled=new Promise<never>((_,reject)=>{
    controller.signal.addEventListener('abort',()=>reject(Error('Review request cancelled')),{once:true});
    timer=timers.setTimeout(()=>{reject(Error('Review request timed out'));controller.abort();},timeoutMs);
   });
   const result=await Promise.race([Promise.resolve().then(()=>load(controller.signal)),cancelled]);
   if(disposed||active!==controller)return false;
   state=acceptSaved?{...state,data:result,newer:null}:state.data?(result.revision!==state.data.revision?{...state,newer:result}:state):{...state,data:result};
   return true;
  }catch(error){if(!disposed&&active===controller)state={...state,error};return false;}
  finally{if(timer!==undefined)timers.clearTimeout(timer);if(active===controller){active=null;state={...state,loading:false};publish();}}
 };
 return {refresh:()=>refresh(),refreshAfterSave:()=>refresh(true),acceptLatest(){if(state.newer){state={...state,data:state.newer,newer:null};publish();}},dispose(){disposed=true;active?.abort();}};
}
