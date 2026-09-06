(function(global){
  'use strict';
  const schedules={
    single:{ded:16100,limits:[12400,50400,105700,201775,256225,640600],rates:[.10,.12,.22,.24,.32,.35,.37]},
    mfs:{ded:16100,limits:[12400,50400,105700,201775,256225,384350],rates:[.10,.12,.22,.24,.32,.35,.37]},
    hoh:{ded:24150,limits:[17700,67450,105700,201750,256200,640600],rates:[.10,.12,.22,.24,.32,.35,.37]},
    mfj:{ded:32200,limits:[24800,100800,211400,403550,512450,768700],rates:[.10,.12,.22,.24,.32,.35,.37]},
    qss:{ded:32200,limits:[24800,100800,211400,403550,512450,768700],rates:[.10,.12,.22,.24,.32,.35,.37]}
  };
  const eicData={
    1:{earned:13020,max:4427,otherStart:23890,otherEnd:51593,jointStart:31160,jointEnd:58863},
    2:{earned:18290,max:7316,otherStart:23890,otherEnd:58629,jointStart:31160,jointEnd:65899},
    3:{earned:18290,max:8231,otherStart:23890,otherEnd:62974,jointStart:31160,jointEnd:70244}
  };

  function parseDate(value){
    const date=new Date(value+'T12:00:00Z');
    if(!value||Number.isNaN(date.getTime()))throw new Error('Introduce fechas válidas para los paystubs.');
    return date;
  }
  function dayOfYear(date){return Math.floor((date-new Date(Date.UTC(date.getUTCFullYear(),0,0)))/86400000);}
  function periodIndex(date,frequency){
    if(frequency===24)return date.getUTCMonth()*2+(date.getUTCDate()>15?2:1);
    if(frequency===12)return date.getUTCMonth()+1;
    return Math.max(1,Math.min(frequency,Math.round(dayOfYear(date)/(365/frequency))));
  }
  function receivedPeriods(first,last,frequency){
    if(first>last)throw new Error('La fecha del primer pago no puede ser posterior a la fecha del último pago.');
    if(frequency===24)return periodIndex(last,24)-periodIndex(first,24)+1;
    if(frequency===12)return (last.getUTCFullYear()-first.getUTCFullYear())*12+last.getUTCMonth()-first.getUTCMonth()+1;
    const interval=frequency===52?7:14;
    return Math.max(1,Math.round((last-first)/86400000/interval)+1);
  }
  function remainingPeriods(last,frequency){return Math.max(0,frequency-periodIndex(last,frequency));}
  function projectPaystub(data){
    const last=parseDate(data.lastPayDate);
    let received;
    if(data.ytdStart==='later')received=receivedPeriods(parseDate(data.firstPayDate),last,data.frequency);
    else received=periodIndex(last,data.frequency);
    if(received<1)throw new Error('No fue posible determinar los pagos incluidos en el YTD.');
    const remaining=remainingPeriods(last,data.frequency);
    const wages=data.ytdWages+(data.ytdWages/received)*remaining+(data.priorWages||0);
    const withholding=data.ytdWithholding+(data.ytdWithholding/received)*remaining+(data.priorWithholding||0);
    return {wages,withholding,received,remaining};
  }
  function ordinaryTax(income,s){
    let tax=0,previous=0;
    for(let i=0;i<s.limits.length;i++){
      const amount=Math.min(income,s.limits[i])-previous;
      if(amount>0)tax+=amount*s.rates[i];
      if(income<=s.limits[i])return {tax,rate:s.rates[i]};
      previous=s.limits[i];
    }
    return {tax:tax+(income-previous)*s.rates[6],rate:s.rates[6]};
  }
  function estimateEIC(earned,agi,kids,status,investment,mfsEligible){
    if(kids<1||investment>12200||(status==='mfs'&&!mfsEligible))return 0;
    const d=eicData[Math.min(3,kids)];
    let credit=Math.min(d.max,d.max*(earned/d.earned));
    const start=status==='mfj'?d.jointStart:d.otherStart;
    const end=status==='mfj'?d.jointEnd:d.otherEnd;
    const measure=Math.max(earned,agi);
    if(measure>start)credit=Math.min(credit,d.max*Math.max(0,(end-measure)/(end-start)));
    return Math.max(0,credit);
  }
  function calculate(input){
    const s=schedules[input.status];
    if(!s)throw new Error('Selecciona un filing status válido.');
    const wages=input.wages,withholding=input.withholding;
    const taxable=Math.max(0,wages-s.ded),base=ordinaryTax(taxable,s);
    const ctcPotential=input.under17*2200;
    const odcPotential=(input.age1718+input.students+input.otherDependents)*500;
    const phaseStart=input.status==='mfj'?400000:200000;
    const phaseReduction=wages>phaseStart?Math.ceil((wages-phaseStart)/1000)*50:0;
    const combined=Math.max(0,ctcPotential+odcPotential-phaseReduction);
    const availableCTC=Math.min(ctcPotential,combined),availableODC=Math.max(0,combined-availableCTC);
    const nonrefundable=Math.min(base.tax,availableCTC+availableODC);
    const ctcUsed=Math.min(availableCTC,nonrefundable);
    const actc=Math.min(Math.max(0,availableCTC-ctcUsed),input.under17*1700,Math.max(0,(wages-2500)*.15));
    const taxAfter=Math.max(0,base.tax-nonrefundable);
    const eic=estimateEIC(wages,wages,input.under17+input.age1718+input.students,input.status,input.investment,input.mfsEligible);
    const refundable=actc+eic;
    return {wages,withholding,deduction:s.ded,taxable,taxBefore:base.tax,rate:base.rate,nonrefundable,taxAfter,actc,eic,refundable,result:withholding+refundable-taxAfter};
  }
  global.Tax2026={projectPaystub,calculate};
})(typeof window!=='undefined'?window:globalThis);
