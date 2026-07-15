import {describe,expect,it} from 'vitest'
import {freshState,install,launch,pickup,tickDanger} from '../src/game-state'
describe('Signal Run state machine',()=>{
  it('requires three distinct pickup/install cycles before launch',()=>{let state=freshState();for(let cell=0;cell<3;cell++){state=pickup(state,cell);expect(state.carrying).toBe(cell);state=install(state);expect(state.installed).toBe(cell+1)}expect(launch(state).phase).toBe('completed')})
  it('cannot phase-skip or hold two cells',()=>{const state=pickup(freshState(),0);expect(pickup(state,1)).toEqual(state);expect(launch(state).phase).toBe('playing')})
  it('supports both explicit failure states',()=>{expect(tickDanger(freshState(),1,100).phase).toBe('failed_shield');const timed=pickup(freshState(),2);expect(tickDanger(timed,60).phase).toBe('failed_timer')})
})
