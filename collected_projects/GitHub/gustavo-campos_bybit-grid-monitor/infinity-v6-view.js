// Autonomous BTC V6-inspired research monitor. Historical TV CSV != venue PnL.
(()=>{
 const root=document.getElementById('v6AutonomousPanel');if(!root)return;
 const byId=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dec=(n,p=2)=>n==null||!Number.isFinite(Number(n))?'—':new Intl.NumberFormat('pt-PT',{minimumFractionDigits:0,maximumFractionDigits:p}).format(Number(n));
 const money=n=>(n>0?'+':'')+dec(n)+' USDT';
 function render(data){
  const x=data?.research?.infinity_v6;
  if(!x||x.status!=='ok'){byId('v6Status').textContent='SEM DADOS';byId('v6Note').textContent='Modelo próprio sem snapshot válido. Nenhuma ordem é autorizada.';return;}
  const h=x.original_csv||{},m=x.model||{},s=x.scanner||{},held=m.holdout_match||{},simulation=m.holdout_147||{};
  byId('v6Status').textContent=x.activation_gate?.status==='BLOCKED'?'VALIDAÇÃO REPROVADA · SEM ORDENS':'PESQUISA · SEM ORDENS';
  byId('v6HistoricalCount').textContent=dec(h.completed_trades,0);
  const hist=h.months||[];
  const wins=hist.reduce((sum,v)=>sum+Number(v.wins||0),0);
  byId('v6HistoricalWR').textContent=h.completed_trades?dec(wins/h.completed_trades*100)+'%':'—';
  byId('v6HistoricalProfit').textContent=money(hist.reduce((sum,v)=>sum+Number(v.net_usdt||0),0));
  byId('v6HoldoutMatch').textContent=dec(held.precision_pct)+'%';
  byId('v6IndependentPF').textContent=dec(simulation.profit_factor,3);
  byId('v6IndependentPnL').textContent=money(simulation.net_usdt);
  const p=x.source_parameters||{},levels=p.profit_lock_levels||[];
  const paired=levels.map(z=>dec(z.profit_trigger_percent)+'%→'+dec(z.lock_in_percent)+'%').join(' · ');
  const v5=x.v5_experimental||{},diag=v5.retrospective_diagnostic_not_clean_oos||{},pnl=v5.economic_proxy_147||{},shadow=v5.shadow||{};
  byId('v6V5Precision').textContent=dec(diag.precision_pct)+'%';
  byId('v6V5Trades').textContent=dec(diag.predicted,0)+' sinais / '+dec(diag.matched,0)+' coincidências';
  byId('v6V5PF').textContent=dec(pnl.profit_factor,3);
  byId('v6V5Return').textContent=dec(pnl.return_pct,3)+'%';
  const v5update=new Date(shadow.updated_utc||'');
  const v5fresh=!Number.isNaN(v5update.valueOf())&&Date.now()-v5update.getTime()<40*60*1000;
  byId('v6V5Shadow').textContent=v5fresh?('Scanner V5 ativo, apenas observação. Candidato atual: '+(shadow.candidate_passed?shadow.candidate_side+' (NÃO OPERAR)':'nenhum')+' · Probabilidade de oportunidade '+dec(100*shadow.gate_probability,1)+'% · Limite '+dec(100*shadow.threshold,0)+'% · Decisões registadas: '+dec(shadow.decision_slots_observed,0)):('Scanner V5 sem atualização recente. Não há ordens autorizadas.');
  byId('v6SourceParams').textContent='Capital base '+dec(p.initial_capital_usdt_reference,0)+' USDT · Stop '+dec(p.atr_stop_loss_multiplier)+'× ATR · Take profit '+dec(p.atr_take_profit_multiplier)+'× ATR · HTF '+(p.higher_timeframe||'—')+' · Trailing '+(p.trailing_sl_start_timeframe||'—')+' · Lock-In '+(p.lock_in_profit_start_timeframe||'—')+' · Trailing '+dec(p.lock_in_trailing_percent)+'% · Níveis '+paired+' · Filtro Momentum '+(p.use_momentum_filter?'ativo':'desativado');
  const broker=x.broker_properties||{};
  byId('v6BrokerProperties').textContent='Gráfico '+(broker.chart_timeframe||'—')+' · Execução '+(broker.script_execution||'—')+' · '+(broker.bar_magnifier||'—')+' · Comissão '+dec(broker.commission_percent_per_order,3)+'% por lado · LONG/SHORT '+dec(broker.leverage_long,0)+'×/'+dec(broker.leverage_short,0)+'× · Slippage '+dec(broker.slippage_ticks,0)+' ticks · Pyramiding '+dec(broker.pyramiding,0)+' · Limite '+(broker.limit_order_execution||'—')+' · Atraso '+(broker.order_execution_delay||'—');
  const exit=x.exit_reconstruction?.elapsed_since_entry||{};
  byId('v6ExitMatch').textContent=exit.compared?dec(exit.exit_in_same_30min,0)+' de '+dec(exit.compared,0)+' saídas próximas até 30 min ('+dec(exit.same_30min_match_pct)+'%)':'A aguardar relatório de correspondência';
  const updated=new Date(s.updated_utc||'');
  const valid=!Number.isNaN(updated.valueOf())&&Date.now()-updated.getTime()<40*60*1000;
  byId('v6LiveSignal').textContent=!valid?'Dados do scanner desatualizados':s.candidate_passed?'HIPÓTESE '+(s.candidate_side||'')+' · NÃO OPERAR':'Sem hipótese válida no último candle';
  byId('v6ScannerTime').textContent=valid?updated.toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  byId('v6Note').textContent='Modelo próprio, independente do TradingView e sem ordens DEMO/LIVE. Validação: '+(held.matched_direction_within_15m??0)+' coincidências de '+(held.predicted_signals??0)+' sinais. '+(x.activation_gate?.status==='BLOCKED'?'Entrada DEMO BLOQUEADA: '+(x.activation_gate?.blockers||[]).slice(0,3).join(' · '):'Em avaliação.');
  byId('v6Monthly').innerHTML=hist.map(z=>'<tr><td>'+esc(z.month)+'</td><td>'+dec(z.trades,0)+'</td><td>'+dec(z.win_rate_pct)+'%</td><td style="text-align:right">'+money(z.net_usdt)+'</td></tr>').join('');
 }
 async function refresh(){
  try{const r=await fetch('./data/grid-status.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('snapshot');render(await r.json());}
  catch{byId('v6Status').textContent='SEM DADOS';byId('v6Note').textContent='Falha ao obter dados; nenhuma ordem está autorizada.';}
 }
 refresh();setInterval(refresh,30000);
})();