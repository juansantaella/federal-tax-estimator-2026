const fs=require('fs'),vm=require('vm');
vm.runInThisContext(fs.readFileSync(__dirname+'/../dist/tax2026.js','utf8'));
function close(actual,expected,label){if(Math.abs(actual-expected)>.01)throw new Error(`${label}: ${actual} != ${expected}`);}
let p=Tax2026.projectPaystub({ytdWages:20000,ytdWithholding:2000,lastPayDate:'2026-06-26',frequency:26,ytdStart:'later',firstPayDate:'2026-03-06',priorWages:5000,priorWithholding:500});
close(p.wages,53888.88888888889,'midyear wages');close(p.withholding,5388.888888888889,'midyear withholding');
let r=Tax2026.calculate({status:'single',wages:60000,withholding:6000,under17:0,age1718:0,students:0,otherDependents:0,investment:0,mfsEligible:false});
close(r.taxable,43900,'single taxable income');close(r.taxBefore,5020,'single tax');
console.log('All tax engine checks passed.');
