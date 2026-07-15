export type Phase='playing'|'completed'|'failed_shield'|'failed_timer'
export interface GameState{installed:number;carrying:number|null;collected:boolean[];shield:number;dustSeconds:number|null;phase:Phase}
export const freshState=():GameState=>({installed:0,carrying:null,collected:[false,false,false],shield:100,dustSeconds:null,phase:'playing'})
export function pickup(s:GameState,cell:number):GameState{if(s.phase!=='playing'||s.carrying!==null||s.collected[cell])return s;const collected=[...s.collected];collected[cell]=true;return{...s,carrying:cell,collected,dustSeconds:cell===2?60:s.dustSeconds}}
export function install(s:GameState):GameState{return s.phase==='playing'&&s.carrying!==null?{...s,installed:Math.min(3,s.installed+1),carrying:null}:s}
export function launch(s:GameState):GameState{return s.phase==='playing'&&s.installed===3?{...s,phase:'completed'}:s}
export function tickDanger(s:GameState,seconds:number,damage=0):GameState{if(s.phase!=='playing')return s;const shield=Math.max(0,s.shield-damage),dustSeconds=s.dustSeconds===null?null:Math.max(0,s.dustSeconds-seconds);if(shield===0)return{...s,shield,dustSeconds,phase:'failed_shield'};if(dustSeconds===0)return{...s,shield,dustSeconds,phase:'failed_timer'};return{...s,shield,dustSeconds}}
