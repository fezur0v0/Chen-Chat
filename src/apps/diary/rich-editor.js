import {Editor,Extension,StarterKit,TextAlign,Plugin} from '../../vendor/tiptap.js';
import {normalizeRichText,plainDocument,richPlain} from './rich-text.js';
export function createRichEditor(element,{content,richText,onChange,onSelection,onLimit,onUndo}){
 const limit=Extension.create({name:'diaryLimit',addProseMirrorPlugins(){return [new Plugin({filterTransaction(tr){
  if(!tr.docChanged)return true;let count=0;tr.doc.descendants(()=>{count++;});
  if(tr.doc.textBetween(0,tr.doc.content.size,'\n').length>12000||count>5500){onLimit();return false;}return true;
 }})];}});
 const editor=new Editor({element,extensions:[StarterKit.configure({undoRedo:false,link:false,code:false,codeBlock:false,heading:{levels:[2,3]}}),TextAlign.configure({types:['heading','paragraph']}),limit],content:normalizeRichText(richText)||plainDocument(content),
  editorProps:{attributes:{class:'diary-rich-editor',role:'textbox','aria-label':'日记正文','aria-multiline':'true','data-placeholder':'今天，有什么想留下的？'},
   handlePaste(view,event){event.preventDefault();const text=event.clipboardData?.getData('text/plain')||'';editor.chain().focus().insertContent(plainDocument(text).content).run();return true;},
   handleDrop(_view,event){if(event.dataTransfer?.files.length){event.preventDefault();return true;}return false;},
   handleKeyDown(_view,event){if(!event.isComposing&&(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();onUndo(event.key.toLowerCase()==='y'||event.shiftKey?1:-1);return true;}return false;}
  },onUpdate:()=>onChange(),onSelectionUpdate:()=>onSelection()});
 const commands={bold:'toggleBold',italic:'toggleItalic',underline:'toggleUnderline',strike:'toggleStrike',list:'toggleBulletList',quote:'toggleBlockquote',rule:'setHorizontalRule'};
 return {document:()=>normalizeRichText(editor.getJSON()),text:()=>richPlain(editor.getJSON()),set(doc){editor.commands.setContent(normalizeRichText(doc)||plainDocument(''),{emitUpdate:false});},
  format(name){const chain=editor.chain().focus();if(name==='h2'||name==='h3')chain.toggleHeading({level:name==='h2'?2:3}).run();else if(commands[name])chain[commands[name]]().run();},
  active(name){return name==='h2'||name==='h3'?editor.isActive('heading',{level:name==='h2'?2:3}):editor.isActive({list:'bulletList',quote:'blockquote'}[name]||name);},
  focus:()=>editor.commands.focus(),destroy:()=>editor.destroy()};
}
