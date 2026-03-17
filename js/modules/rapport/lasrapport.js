
function genereerLasRapport(las){

const { jsPDF } = window.jspdf;

const doc=new jsPDF();

doc.text("LAS INSPECTIERAPPORT",20,20);

doc.text("Lasnummer: "+las.lasnummer,20,40);
doc.text("Status: "+las.status,20,50);
doc.text("Controleur: "+las.controleur,20,60);
doc.text("Datum: "+las.datum,20,70);

doc.save("lasrapport_"+las.lasnummer+".pdf");

}
