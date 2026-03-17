
function exporteerCEDossier(project){

const { jsPDF } = window.jspdf;

const doc=new jsPDF();

doc.setFontSize(18);
doc.text("CE DOSSIER",20,20);

doc.setFontSize(12);

doc.text("Project: "+project.naam,20,40);
doc.text("Opdrachtgever: "+project.opdrachtgever,20,50);
doc.text("Executieklasse: "+project.exc,20,60);

let y=80;

project.lassen.forEach(las=>{
doc.text("Las "+las.lasnummer+" - "+las.status,20,y);
y+=10;
});

doc.save("CE_dossier_"+project.naam+".pdf");

}
