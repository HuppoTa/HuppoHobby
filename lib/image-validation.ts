// Structural checks + dimensions, not a full decoder or malware scanner.
const MAX_DIMENSION=8192,MAX_PIXELS=24000000;
function dimensions(width:number,height:number){return width>0&&height>0&&width<=MAX_DIMENSION&&height<=MAX_DIMENSION&&width*height<=MAX_PIXELS;}
export function inspectImage(bytes:Uint8Array):{ext:string;type:string}|null {
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(start:number,length:number)=>String.fromCharCode(...bytes.subarray(start,start+length));
 if(bytes.length>=45&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){
  let offset=8,header=false,data=false,end=false;
  while(offset+12<=bytes.length){const length=view.getUint32(offset),kind=text(offset+4,4);if(length>bytes.length-offset-12)return null;
   if(!header){if(kind!=="IHDR"||length!==13||!dimensions(view.getUint32(offset+8),view.getUint32(offset+12)))return null;header=true;}
   else if(kind==="IHDR")return null;
   if(kind==="IDAT"&&length>0)data=true;
   offset+=length+12;
   if(kind==="IEND"){if(length!==0||offset!==bytes.length)return null;end=true;break;}
  }
  return header&&data&&end?{ext:"png",type:"image/png"}:null;
 }
 if(bytes.length>=12&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
  let offset=2,frame=false;
  while(offset+4<=bytes.length){if(bytes[offset++]!==255)return null;while(bytes[offset]===255)offset++;const marker=bytes[offset++];
   if(offset+2>bytes.length)return null;
   const length=view.getUint16(offset);
   if(marker===0xda)return frame&&length>=8&&offset+length<bytes.length-2?{ext:"jpg",type:"image/jpeg"}:null;if(length<2||offset+length>bytes.length)return null;
   if([0xc0,0xc1,0xc2].includes(marker)){if(length<8||!dimensions(view.getUint16(offset+5),view.getUint16(offset+3)))return null;frame=true;}
   offset+=length;
  }
  return null;
 }
 if(bytes.length>=30&&text(0,4)==="RIFF"&&text(8,4)==="WEBP"&&view.getUint32(4,true)+8===bytes.length){
  let offset=12,image=false;
  while(offset+8<=bytes.length){const kind=text(offset,4),length=view.getUint32(offset+4,true),start=offset+8;if(length>bytes.length-start)return null;
   if(kind==="VP8 "&&length>=10){if(text(start+3,3)!=="\x9d\x01\x2a"||!dimensions(view.getUint16(start+6,true)&0x3fff,view.getUint16(start+8,true)&0x3fff))return null;image=true;}
   if(kind==="VP8L"&&length>=5){if(bytes[start]!==0x2f)return null;const bits=view.getUint32(start+1,true);if(!dimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1))return null;image=true;}
   if(kind==="VP8X"&&length>=10){const width=1+bytes[start+4]+(bytes[start+5]<<8)+(bytes[start+6]<<16),height=1+bytes[start+7]+(bytes[start+8]<<8)+(bytes[start+9]<<16);if(!dimensions(width,height)||bytes[start]&2)return null;}
   offset=start+length+(length%2);
  }
  return image&&offset===bytes.length?{ext:"webp",type:"image/webp"}:null;
 }
 return null;
}
