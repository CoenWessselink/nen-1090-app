/* TinyZip (store-only) — no dependencies, file:// compatible.
   Produces a valid ZIP with STORED method (no compression). */
(function(){
  // CRC32
  const CRC_TABLE = (function(){
    const t = new Uint32Array(256);
    for(let i=0;i<256;i++){
      let c=i;
      for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1);
      t[i]=c>>>0;
    }
    return t;
  })();
  function crc32(buf){
    let c = 0xFFFFFFFF;
    for(let i=0;i<buf.length;i++){
      c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c>>>8);
    }
    return (c ^ 0xFFFFFFFF)>>>0;
  }
  function encUTF8(str){ return new TextEncoder().encode(str); }
  function dosDateTime(d){
    const dt = d instanceof Date ? d : new Date();
    let year = dt.getFullYear(); if(year<1980) year=1980;
    const dosDate = ((year-1980)<<9) | ((dt.getMonth()+1)<<5) | dt.getDate();
    const dosTime = (dt.getHours()<<11) | (dt.getMinutes()<<5) | ((dt.getSeconds()/2)|0);
    return {dosDate, dosTime};
  }
  function u16(n){ const b=new Uint8Array(2); b[0]=n&0xFF; b[1]=(n>>>8)&0xFF; return b; }
  function u32(n){ const b=new Uint8Array(4); b[0]=n&0xFF; b[1]=(n>>>8)&0xFF; b[2]=(n>>>16)&0xFF; b[3]=(n>>>24)&0xFF; return b; }

  function concat(chunks){
    const total = chunks.reduce((a,c)=>a + c.length, 0);
    const out = new Uint8Array(total);
    let off=0;
    for(const c of chunks){ out.set(c, off); off += c.length; }
    return out;
  }

  function base64ToBytes(dataUrlOrB64){
    const s = String(dataUrlOrB64||"");
    const b64 = s.includes(",") ? s.split(",")[1] : s;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }

  class TinyZip {
    constructor(){ this.files=[]; }
    addBytes(path, bytes, mtime){
      const name = path.replace(/\\/g,"/").replace(/^\/+/,"");
      this.files.push({name, bytes: (bytes instanceof Uint8Array)? bytes : new Uint8Array(bytes), mtime: mtime||new Date()});
    }
    addText(path, text, mtime){
      this.addBytes(path, encUTF8(String(text??"")), mtime);
    }
    addDataUrl(path, dataUrl, mtime){
      this.addBytes(path, base64ToBytes(dataUrl), mtime);
    }
    build(){
      const localParts=[];
      const centralParts=[];
      let offset=0;
      for(const f of this.files){
        const nameBytes = encUTF8(f.name);
        const {dosDate, dosTime} = dosDateTime(f.mtime);
        const crc = crc32(f.bytes);
        const size = f.bytes.length>>>0;

        // Local file header
        const local = [
          u32(0x04034b50), // sig
          u16(20), // version needed
          u16(0), // flags
          u16(0), // method 0 store
          u16(dosTime),
          u16(dosDate),
          u32(crc),
          u32(size),
          u32(size),
          u16(nameBytes.length),
          u16(0), // extra len
          nameBytes,
          f.bytes
        ];
        const localBlob = concat(local);
        localParts.push(localBlob);

        // Central directory header
        const central = [
          u32(0x02014b50),
          u16(20), // version made by
          u16(20), // version needed
          u16(0), // flags
          u16(0), // method
          u16(dosTime),
          u16(dosDate),
          u32(crc),
          u32(size),
          u32(size),
          u16(nameBytes.length),
          u16(0), // extra
          u16(0), // comment
          u16(0), // disk start
          u16(0), // int attrs
          u32(0), // ext attrs
          u32(offset),
          nameBytes
        ];
        const centralBlob = concat(central);
        centralParts.push(centralBlob);

        offset += localBlob.length;
      }

      const centralStart = offset;
      const centralDir = concat(centralParts);
      offset += centralDir.length;

      // End of central directory
      const end = concat([
        u32(0x06054b50),
        u16(0), u16(0),
        u16(this.files.length),
        u16(this.files.length),
        u32(centralDir.length),
        u32(centralStart),
        u16(0)
      ]);

      const out = concat([...localParts, centralDir, end]);
      return out;
    }
  }

  window.TinyZip = TinyZip;
})();
