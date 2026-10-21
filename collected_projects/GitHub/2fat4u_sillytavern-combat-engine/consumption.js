// One cost source per use. Healing profiles may link to the same actor's ammo/mana stock.
export function unitCost(value=1) { const n=Number(value);if(value===''||value==null||typeof value==='boolean'||!Number.isSafeInteger(n)||n<0||n>1000000)throw new Error('Kosten: ganze Zahl 0 bis 1000000 erforderlich.');return n; }
export function consumption(s,a,p,supply=false) {
    const cost=s.rules.resourcesEnabled?unitCost(p.cost??1):0;
    const id=supply?(p.consumption==='none'?null:p.consumption==='linked'?p.stock:p.id):p.resource;
    const stock=id?a.resources.find(r=>r.id===id):null;
    return {cost:id?cost:0,stock,id:id??null,available:!id||cost===0||Boolean(stock&&stock.quantity>=cost)};
}
export function canPay(s,a,p,supply=false) { return consumption(s,a,p,supply).available; }
export function pay(s,a,p,supply=false) {const v=consumption(s,a,p,supply);if(!v.available)throw new Error('Vorrat ist aufgebraucht oder reicht nicht für die Kosten dieses Einsatzes.');if(v.cost)v.stock.quantity-=v.cost;return v.stock?{id:v.stock.id,name:v.stock.name,quantity:v.stock.quantity,cost:v.cost}:null;}
