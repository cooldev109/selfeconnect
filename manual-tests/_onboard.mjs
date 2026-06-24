import { chromium } from "@playwright/test";
const SK=process.env.SK;
const auth="Basic "+Buffer.from(SK+":").toString("base64");
const post=(u,b)=>fetch(u,{method:"POST",headers:{Authorization:auth,"Content-Type":"application/x-www-form-urlencoded"},body:b}).then(r=>r.json());
const get=(u)=>fetch(u,{headers:{Authorization:auth}}).then(r=>r.json());
const acct=await post("https://api.stripe.com/v1/accounts", new URLSearchParams({"controller[stripe_dashboard][type]":"express","controller[fees][payer]":"application","controller[losses][payments]":"application","controller[requirement_collection]":"stripe",country:"GB",email:"onb@example.com","capabilities[transfers][requested]":"true"}).toString());
const link=await post("https://api.stripe.com/v1/account_links", new URLSearchParams({account:acct.id,type:"account_onboarding",refresh_url:"https://luxerontech.com/api/v1/connect/return",return_url:"https://luxerontech.com/api/v1/connect/return"}).toString());
console.log("acct:",acct.id);
const b=await chromium.launch();
const p=await (await b.newContext()).newPage();
await p.goto(link.url,{waitUntil:"domcontentloaded"});

const clickIf=async(re)=>{const btns=p.locator('button,[role=button],a[role=button]');const n=await btns.count();for(let i=0;i<n;i++){const el=btns.nth(i);const t=(await el.innerText().catch(()=>"")||"").trim();if(re.test(t)&&await el.isVisible().catch(()=>0)&&await el.isEnabled().catch(()=>0)){await el.click().catch(()=>{});return t;}}return null;};

// Step 1: phone
await p.waitForTimeout(4000);
let used=await clickIf(/Use test phone number/i);
console.log("phone shortcut:",used);
await p.waitForTimeout(1500);
await clickIf(/^Submit$|^Continue$/i);
await p.waitForTimeout(3000);
// OTP: fill 000000 if an otp input is present
const otp=p.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"], input[name*="otp" i]').first();
if(await otp.count() && await otp.isVisible().catch(()=>0)){ await otp.click(); await otp.pressSequentially("000000",{delay:30}); console.log("otp entered"); }
await p.waitForTimeout(3000);

// Loop through remaining steps
for(let step=0; step<25; step++){
  if(/luxerontech\.com/.test(p.url())){ console.log("returned to app at step",step); break; }
  await p.waitForTimeout(1500);
  // prefer test-data shortcuts, else primary continue
  let clicked = await clickIf(/Use test|Skip|Fill (with )?test/i)
            || await clickIf(/Agree & submit|Agree and submit|Submit|Continue|Done|Next|Save|Confirm|Finish|Accept/i);
  const txt=(await p.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,90)).catch(()=>""));
  console.log(`step ${step}: clicked=${clicked} | ${txt}`);
  if(!clicked){ await p.screenshot({path:`/tmp/onb_step${step}.png`,fullPage:true}); }
  await p.waitForTimeout(2500);
}
const fresh=await get(`https://api.stripe.com/v1/accounts/${acct.id}`);
console.log("RESULT payouts_enabled:",fresh.payouts_enabled,"| transfers:",fresh.capabilities?.transfers,"| due:",JSON.stringify(fresh.requirements?.currently_due));
await p.screenshot({path:"/tmp/onb_final.png",fullPage:true}).catch(()=>{});
await b.close();
await fetch(`https://api.stripe.com/v1/accounts/${acct.id}`,{method:"DELETE",headers:{Authorization:auth}});
