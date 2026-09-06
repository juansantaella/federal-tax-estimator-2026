(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const number=id=>Math.max(0,Number($(id).value)||0);
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.round(value||0));

  function toggle(id,show){$(id).classList.toggle('hidden',!show);}
  function updatePerson(prefix){
    const annual=$(prefix+'Method').value==='annual';
    toggle(prefix+'Stub',!annual);toggle(prefix+'Annual',annual);
    const later=!annual&&$(prefix+'YtdStart').value==='later';
    toggle(prefix+'Later',later);
    toggle(prefix+'PriorFields',later&&$(prefix+'PriorJob').value==='yes');
  }
  function updateForm(){
    const status=$('status').value,deps=$('hasDeps').value==='yes';
    toggle('spouseBox',status==='mfj');toggle('depsPanel',deps);toggle('hohConfirm',status==='hoh');toggle('mfsEicBox',status==='mfs');
    updatePerson('t');updatePerson('s');
  }
  function person(prefix){
    if($(prefix+'Method').value==='annual')return {wages:number(prefix+'AnnualWages'),withholding:number(prefix+'AnnualWh')};
    const later=$(prefix+'YtdStart').value==='later';
    if(!$(prefix+'Date').value)throw new Error('Introduce la fecha del último pago.');
    if(later&&!$(prefix+'FirstPay').value)throw new Error('Introduce la fecha del primer pago incluido en el YTD.');
    return Tax2026.projectPaystub({
      ytdWages:number(prefix+'YtdWages'),ytdWithholding:number(prefix+'YtdWh'),lastPayDate:$(prefix+'Date').value,
      frequency:Number($(prefix+'Freq').value),ytdStart:$(prefix+'YtdStart').value,firstPayDate:$(prefix+'FirstPay').value,
      priorWages:later&&$(prefix+'PriorJob').value==='yes'?number(prefix+'PriorWages'):0,
      priorWithholding:later&&$(prefix+'PriorJob').value==='yes'?number(prefix+'PriorWh'):0
    });
  }
  function render(r){
    const map={rWages:r.wages,rWh:r.withholding,rDed:r.deduction,rTaxable:r.taxable,rTaxBefore:r.taxBefore,rNonref:r.nonrefundable,rAfter:r.taxAfter,rActc:r.actc,rEic:r.eic,rRefundable:r.refundable};
    Object.entries(map).forEach(([id,value])=>$(id).textContent=money(value));
    $('rRate').textContent=Math.round(r.rate*100)+'%';
    $('headline').className='headline '+(r.result>=0?'refund':'due');
    $('resultLabel').textContent=r.result>=0?'Estimated refund':'Estimated balance due';
    $('resultAmount').textContent=money(Math.abs(r.result));
    $('results').style.display='block';$('results').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function submit(event){
    event.preventDefault();const error=$('error');error.style.display='none';
    try{
      const status=$('status').value,hasDeps=$('hasDeps').value==='yes';
      if(status==='hoh'&&!$('hohOK').checked)throw new Error('Confirma los requisitos de Head of Household.');
      if(hasDeps&&!$('eligibility').checked)throw new Error('Confirma los requisitos aplicables a los dependientes.');
      const taxpayer=person('t'),spouse=status==='mfj'?person('s'):{wages:0,withholding:0};
      const counts={under17:hasDeps?Math.floor(number('under17')):0,age1718:hasDeps?Math.floor(number('age1718')):0,students:hasDeps?Math.floor(number('students')):0,otherDependents:hasDeps?Math.floor(number('otherDeps')):0};
      if(taxpayer.wages+spouse.wages<=0)throw new Error('Introduce federal taxable wages mayores de cero.');
      if(hasDeps&&Object.values(counts).reduce((a,b)=>a+b,0)===0)throw new Error('Introduce al menos un dependiente o selecciona No.');
      render(Tax2026.calculate({status,wages:taxpayer.wages+spouse.wages,withholding:taxpayer.withholding+spouse.withholding,...counts,investment:hasDeps?number('investment'):0,mfsEligible:$('mfsEic').checked}));
    }catch(e){error.textContent=e.message;error.style.display='block';$('results').style.display='none';error.scrollIntoView({behavior:'smooth',block:'center'});}
  }
  ['status','hasDeps','tMethod','sMethod','tYtdStart','sYtdStart','tPriorJob','sPriorJob'].forEach(id=>$(id).addEventListener('change',updateForm));
  $('estimator').addEventListener('submit',submit);$('printButton').addEventListener('click',()=>window.print());updateForm();
})();
