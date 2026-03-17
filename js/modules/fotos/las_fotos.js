
let fotosStore=[];

function uploadLasFoto(lasId,file){

const reader=new FileReader();

reader.onload=function(e){

const foto={
id:Date.now(),
lasId:lasId,
image:e.target.result
};

fotosStore.push(foto);

renderLasFotos(lasId);

};

reader.readAsDataURL(file);
}

function renderLasFotos(lasId){

const fotos=fotosStore.filter(f=>f.lasId===lasId);

const container=document.getElementById("lasFotosLijst");

if(!container) return;

container.innerHTML="";

fotos.forEach(f=>{

const img=document.createElement("img");
img.src=f.image;
img.className="las-foto";

container.appendChild(img);

});

}
