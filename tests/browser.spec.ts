import {expect,test} from '@playwright/test'

const held=async(page:any,code:string,ms:number)=>{await page.keyboard.down(code);await page.waitForTimeout(ms);await page.keyboard.up(code)}
async function moveTo(page:any,targetX:number,targetZ:number,tolerance=1.8){
  let previousDistance=Number.POSITIVE_INFINITY,stalledSteps=0
  for(let step=0;step<320;step++){
    const sample=await page.evaluate(()=>{const game=(window as any).__EOS7__;return{position:game.getPlayerPosition(),basis:game.getMovementBasis()}})
    const dx=targetX-sample.position.x,dz=targetZ-sample.position.z,distance=Math.hypot(dx,dz)
    if(distance<=tolerance)return
    stalledSteps=distance>=previousDistance-.02?stalledSteps+1:0
    if(stalledSteps>=30)throw new Error(`Keyboard navigation stalled at ${sample.position.x.toFixed(2)},${sample.position.z.toFixed(2)} while targeting ${targetX},${targetZ}`)
    previousDistance=distance
    const directions=[
      {key:'w',...sample.basis.forward},
      {key:'d',...sample.basis.right},
      {key:'s',x:-sample.basis.forward.x,z:-sample.basis.forward.z},
      {key:'a',x:-sample.basis.right.x,z:-sample.basis.right.z},
    ]
    const direction=directions.reduce((best,current)=>current.x*dx+current.z*dz>best.x*dx+best.z*dz?current:best)
    await held(page,direction.key,Math.min(220,Math.max(60,distance*20)))
  }
  throw new Error(`Keyboard navigation did not reach ${targetX},${targetZ}`)
}

test('keyboard-driven full loop, launch, and restart',async({page})=>{const errors:string[]=[],failed:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failed.push(`${r.url()} ${r.failure()?.errorText}`));await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:20000});await page.screenshot({path:'evidence/onboarding.png'});for(const [x,z] of [[0,-8],[12,-20],[-12,-34]]){await page.evaluate(([px,pz])=>(window as any).__EOS7__.teleport(px,pz),[x,z]);await page.keyboard.press('e');await page.evaluate(()=>(window as any).__EOS7__.teleport(0,7));await page.keyboard.press('e')}await expect(page.locator('#cells')).toHaveText('3 / 3');await page.keyboard.press('e');await expect(page.locator('#terminal-title')).toHaveText('Eos-7 is online');await page.screenshot({path:'evidence/completed.png'});await page.keyboard.press('r');await expect(page.locator('#cells')).toHaveText('0 / 3');await expect(page.locator('#terminal')).toBeHidden();expect(errors).toEqual([]);expect(failed).toEqual([]);expect(await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,y:document.documentElement.scrollHeight-innerHeight}))).toEqual({x:0,y:0})})

test('camera-relative WASD traverses every route without phase skip',async({page})=>{test.setTimeout(140000);await page.goto('/');await expect(page.locator('#loading')).toBeHidden({timeout:20000});await page.evaluate(()=>(window as any).__EOS7__.setMovementScale(8));await moveTo(page,0,-8);await page.keyboard.press('e');expect(await page.evaluate(()=>(window as any).__EOS7__.getState().carrying)).toBe(0);await moveTo(page,0,7);await page.keyboard.press('e');await expect(page.locator('#cells')).toHaveText('1 / 3');await moveTo(page,12,-20);await page.keyboard.press('e');expect(await page.evaluate(()=>(window as any).__EOS7__.getState().carrying)).toBe(1);await moveTo(page,0,7);await page.keyboard.press('e');await expect(page.locator('#cells')).toHaveText('2 / 3');await moveTo(page,-12,-34);await page.keyboard.press('e');expect(await page.evaluate(()=>(window as any).__EOS7__.getState().carrying)).toBe(2);await moveTo(page,0,7);await page.keyboard.press('e');await expect(page.locator('#cells')).toHaveText('3 / 3');await page.keyboard.press('e');await expect(page.locator('#terminal-title')).toHaveText('Eos-7 is online');await page.keyboard.press('r');await expect(page.locator('#cells')).toHaveText('0 / 3')})
