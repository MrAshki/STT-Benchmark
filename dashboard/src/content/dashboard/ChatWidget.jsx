import React, {useEffect, useRef, useState} from 'react';
import {DataComponent} from '../../data-app-public.jsx';
import {fmt} from './metrics.mjs';
import {RobotIcon} from './RobotIcon.jsx';
import {ChatIcon} from './ChatIcon.jsx';
import './chat-widget.css';

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
function IconButton({icon, label, className = '', ...props}) {
  return <button type="button" className={`stt-assistant-icon ${className}`} title={label} aria-label={label} {...props}><ChatIcon name={icon}/></button>;
}

export function ChatWidget({lang, rows, summary, facts, filters, profile, evidence}) {
  const fa = lang === 'fa', t = (en, text) => fa ? text : en;
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false);
  const [view, setView] = useState('chat'), [settingsTab, setSettingsTab] = useState('preferences');
  const [key, setKey] = useState(''), [configured, setConfigured] = useState(false), [mode, setMode] = useState('local');
  const [messages, setMessages] = useState([]), [question, setQuestion] = useState(''), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(''), [history, setHistory] = useState([]), [chatId, setChatId] = useState(makeId);
  const [search, setSearch] = useState(''), [files, setFiles] = useState([]), [voice, setVoice] = useState(false);
  const [context, setContext] = useState(true), [compact, setCompact] = useState(false), [length, setLength] = useState('balanced');
  const [showPrompts, setShowPrompts] = useState(true), [feedback, setFeedback] = useState({}), [saved, setSaved] = useState([]);
  const [keyBusy, setKeyBusy] = useState(false);
  const trigger = useRef(null), input = useRef(null), abort = useRef(null), conversation = useRef(null), fileInput = useRef(null);
  const timer = useRef(null), noticeId = useRef(0), mounted = useRef(true);
  const localFacts = fa ? (facts.rank.length
    ? `${facts.rank[0].name} با WER برابر ${fmt(facts.rank[0].WER)}٪ کمترین خطای واژه را در نمای فعلی دارد. ${facts.speed[0]?.name || 'مدل زمان‌سنجی‌شده‌ای موجود نیست'} کمترین زمان پردازش ثبت‌شده را دارد (${fmt(facts.speed[0]?.seconds)} ثانیه). این مقایسه مربوط به فایل‌های انتخاب‌شده و همین سیستم است.`
    : 'خروجی قابل امتیازدهی در این نما وجود ندارد.') : facts.text;
  const prompts = [
    {icon:'chart', title:t('Compare accuracy', 'مقایسهٔ دقت مدل‌ها'), subtitle:t('Word and character errors', 'خطای واژه و نویسه'), question:t('Compare model accuracy in this view.', 'دقت مدل‌ها را در این نما مقایسه کن.')},
    {icon:'speed', title:t('Find the fastest model', 'کدام مدل سریع‌تر است؟'), subtitle:t('Time and processing speed', 'زمان و سرعت پردازش'), question:t('Which model has the shortest processing time?', 'کدام مدل کمترین زمان پردازش را دارد؟')},
    {icon:'text', title:t('Check meaning and style', 'بررسی معنا و لحن'), subtitle:t('Read the saved text reviews', 'ارزیابی‌های متنی ثبت‌شده'), question:t('Compare the saved meaning and style reviews.', 'ارزیابی ثبت‌شدهٔ معنا و لحن مدل‌ها را مقایسه کن.')},
    {icon:'layers', title:t('Explain these results', 'این نتایج چه می‌گویند؟'), subtitle:t('A guide to the current view', 'راهنمای نمای فعلی'), question:t('Explain these benchmark results and their limits.', 'نتایج این بنچمارک و محدودیت‌های آن را توضیح بده.')},
  ];

  function inform(text) { noticeId.current += 1; setNotice(text); }
  function preview(name) { inform(t(`${name}: preview only. No service is connected.`, `${name}: فقط پیش‌نمایش است و به سرویسی متصل نیست.`)); }
  function stop() { abort.current?.abort(); clearTimeout(timer.current); setBusy(false); }
  function close() { setOpen(false); trigger.current?.focus(); }
  function archive() {
    if (!messages.length) return;
    const item = {id:chatId, title:messages.find(m => m.role === 'user')?.content || t('New chat','گفت‌وگوی جدید'), messages, mode};
    setHistory(items => [item, ...items.filter(h => h.id !== chatId)].slice(0, 20));
  }
  function newChat() {
    stop(); archive(); setChatId(makeId()); setMessages([]); setQuestion(''); setFiles([]); setVoice(false); setNotice(''); setView('chat');
    requestAnimationFrame(() => input.current?.focus({preventScroll:true}));
  }
  function restoreChat(item) {
    stop(); archive(); setChatId(item.id); setMessages(item.messages); setMode(item.mode); setQuestion(''); setFiles([]); setView('chat');
    requestAnimationFrame(() => input.current?.focus({preventScroll:true}));
  }
  useEffect(() => {
    stop(); setMessages([]); setHistory([]); setSaved([]); setFeedback({}); setQuestion(''); setFiles([]); setVoice(false); setChatId(makeId());
  }, [filters, profile, lang]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; abort.current?.abort(); clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/status', {signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => setConfigured(Boolean(data.configured)))
      .catch(error => { if (error.name !== 'AbortError') setConfigured(false); });
    return () => controller.abort();
  }, [open]);
  useEffect(() => { if (open && view === 'chat') input.current?.focus({preventScroll:true}); }, [open]);
  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = messages.length || busy ? conversation.current.scrollHeight : 0;
  }, [open, view, messages, busy]);
  useEffect(() => {
    if (!notice) return;
    const id = noticeId.current, timeout = setTimeout(() => { if (noticeId.current === id) setNotice(''); }, 6000);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function updateKey(clear = false) {
    if (keyBusy) return;
    setKeyBusy(true);
    try {
      const response = await fetch('/api/settings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(clear ? {clear:true} : {api_key:key})});
      const data = await response.json();
      if (!response.ok) throw Error();
      if (!mounted.current) return;
      setConfigured(Boolean(data.configured)); setKey(''); setMode(clear ? 'local' : 'openrouter');
      inform(clear ? t('The active key was cleared.', 'کلید فعال پاک شد.') : t('Key loaded. Send a question to check the connection.', 'کلید بارگذاری شد. برای بررسی اتصال، یک سؤال ارسال کنید.'));
    } catch {
      if (mounted.current) inform(t('The key could not be changed. Check the local server.', 'کلید تغییر نکرد. سرور محلی را بررسی کنید.'));
    } finally { if (mounted.current) setKeyBusy(false); }
  }
  function localAnswer(q) {
    if (/meaning|semantic|style|formal|معنا|لحن|رسمی/i.test(q)) {
      return `${localFacts}\n\n${t('Saved text reviews from one reviewer. These are not objective scores:', 'نظرهای متنی ذخیره‌شده از یک ارزیاب؛ این موارد امتیاز عینی نیستند:')}\n${summary.map(m => `${m.name}: ${m.full}/${m.reviewed} ${t('meaning retained','حفظ کامل معنا')} · ${m.critical} ${t('key changes','تغییر مهم')}`).join('\n')}`;
    }
    return `${localFacts}\n\n${t('Local mode gives a fixed comparison from the current view. Use the connection settings for AI chat.', 'حالت محلی یک مقایسهٔ ثابت از نمای فعلی ارائه می‌دهد. برای گفت‌وگو با هوش مصنوعی، از تنظیمات اتصال استفاده کنید.')}`;
  }
  async function ask(event, retryQuestion) {
    event?.preventDefault();
    const q = (retryQuestion || question).trim();
    if (!q || busy || (mode === 'openrouter' && !configured)) return;
    if (mode === 'openrouter' && !context) { inform(t('Enable benchmark context before you send an API question.', 'پیش از ارسال سؤال به API، داده‌های بنچمارک را فعال کنید.')); return; }
    const controller = new AbortController(); abort.current = controller;
    const priorMessages = retryQuestion ? messages.slice(0, -2) : messages;
    const base = retryQuestion ? messages.slice(0, messages.length - 1) : [...messages, {id:makeId(), role:'user', content:q, attachments:files.map(f => f.name)}];
    setMessages(base); setQuestion(''); setFiles([]); setBusy(true); setVoice(false);
    try {
      let answer;
      if (mode === 'openrouter') {
        const response = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, signal:controller.signal,
          body:JSON.stringify({question:q, filters, profile, history:priorMessages.slice(-6).map(({role, content}) => ({role, content})), language:lang})});
        const data = await response.json();
        if (!response.ok) throw Error(data.error || t('The API request failed.', 'درخواست API ناموفق بود.'));
        answer = data.answer;
      } else {
        await new Promise(resolve => { timer.current = setTimeout(resolve, 550); controller.signal.addEventListener('abort', resolve, {once:true}); });
        answer = mode === 'preview' ? t('This is a sample reply. Model selection, web search, file analysis and voice controls are interface previews. No external service received this message.', 'این یک پاسخ نمونه است. انتخاب مدل، جست‌وجوی وب، تحلیل فایل و کنترل‌های صوتی فقط پیش‌نمایش رابط هستند. این پیام به سرویس خارجی ارسال نشده است.') : localAnswer(q);
      }
      if (!controller.signal.aborted) setMessages(items => [...items, {id:makeId(), role:'assistant', content:answer, mode}]);
    } catch (error) {
      if (!controller.signal.aborted) setMessages(items => [...items, {id:makeId(), role:'assistant', content:t('API error: ', 'خطای API: ') + error.message, mode, error:true}]);
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); inform(t('Text copied.', 'متن کپی شد.')); }
    catch { inform(t('The browser did not allow copying. Select and copy the text.', 'مرورگر اجازهٔ کپی نداد. متن را انتخاب و کپی کنید.')); }
  }
  function exportChat() {
    if (!messages.length) { inform(t('Send a message before you export the chat.', 'برای دریافت گفت‌وگو، ابتدا یک پیام ارسال کنید.')); return; }
    const text = messages.map(m => `${m.role === 'user' ? t('You','شما') : t('Assistant','دستیار')}\n${m.content}`).join('\n\n---\n\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'benchmark-chat.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    inform(t('Chat exported.', 'فایل گفت‌وگو آماده شد.'));
  }
  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    setFiles(items => [...items, ...selected.map(file => ({id:makeId(), name:file.name}))].slice(0, 5)); event.target.value = '';
    if (selected.length) inform(t('File names added for preview. Files are not read or uploaded.', 'نام فایل‌ها برای پیش‌نمایش اضافه شد. فایل‌ها خوانده یا بارگذاری نمی‌شوند.'));
  }
  function choosePrompt(prompt) { setQuestion(prompt.question); setView('chat'); requestAnimationFrame(() => input.current?.focus({preventScroll:true})); }
  const tabs = [{id:'chat', icon:'chat', label:t('Chat','گفت‌وگو')}, {id:'history', icon:'history', label:t('History','تاریخچه')}, {id:'saved', icon:'bookmark', label:t('Saved','ذخیره‌شده‌ها')}];
  const scopeName = t(({raw:'Raw text', orthography:'Spelling', number:'Numbers'})[profile], ({raw:'متن خام', orthography:'نوشتار یکسان', number:'اعداد یکسان'})[profile]);
  const allChats = messages.length ? [{id:chatId, title:messages.find(m => m.role === 'user')?.content, messages, mode}, ...history.filter(h => h.id !== chatId)] : history;
  const filteredChats = allChats.filter(item => `${item.title} ${item.messages.map(m => m.content).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return <div className="stt-chat-widget" dir={fa ? 'rtl' : 'ltr'} lang={lang}>
    <button ref={trigger} className="stt-chat-launcher" aria-label={t('Open benchmark assistant','باز کردن دستیار بنچمارک')} aria-expanded={open} aria-controls="stt-assistant-panel" onClick={() => setOpen(!open)}><RobotIcon size={64}/></button>
    {open && <aside id="stt-assistant-panel" className={`stt-assistant-panel ${expanded ? 'is-expanded' : ''} ${compact ? 'is-compact' : ''}`} aria-label={t('Benchmark assistant','دستیار بنچمارک')}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (view === 'settings') setView('chat'); else close(); } }}>
      <DataComponent id="data-assistant" title={t('Benchmark assistant','دستیار بنچمارک')} variant="plain" className="stt-assistant-shell" {...evidence} displayRows={summary}>
        <div className="stt-assistant-body">
          <div className="stt-assistant-toolbar">
            <label className="stt-assistant-model"><span className="stt-assistant-model-symbol"><ChatIcon name="sparkles"/></span><span className="stt-visually-hidden">{t('Response model','مدل پاسخ‌گو')}</span><select aria-label={t('Response model','مدل پاسخ‌گو')} value={mode} disabled={busy} onChange={event => { setMode(event.target.value); if (event.target.value === 'preview') preview(t('Model selection','انتخاب مدل')); }}><option value="local">{t('Local data guide','راهنمای محلی داده')}</option><option value="openrouter">DeepSeek · OpenRouter</option><option value="preview">{t('Other models · preview','مدل‌های دیگر · پیش‌نمایش')}</option></select></label>
            <span className="stt-assistant-status"><i/>{mode === 'local' ? t('Local','محلی') : mode === 'preview' ? t('Preview','پیش‌نمایش') : configured ? t('Key loaded','کلید موجود') : t('No key','بدون کلید')}</span><IconButton icon="plus" label={t('New chat','گفت‌وگوی جدید')} onClick={newChat}/><div className="stt-assistant-window-actions"><IconButton icon={expanded ? 'collapse' : 'expand'} label={expanded ? t('Reduce panel','کوچک کردن پنجره') : t('Expand panel','بزرگ کردن پنجره')} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}/><IconButton icon="close" label={t('Close assistant','بستن دستیار')} onClick={close}/></div>
          </div>
          <div className="stt-assistant-navigation"><div className="stt-assistant-tabs" role="tablist" aria-label={t('Assistant views','بخش‌های دستیار')}>
            {tabs.map((tab, index) => <button type="button" key={tab.id} id={`stt-assistant-tab-${tab.id}`} role="tab" aria-selected={view === tab.id} aria-controls={`stt-assistant-view-${tab.id}`} tabIndex={view === tab.id || (view === 'settings' && index === 0) ? 0 : -1}
              onKeyDown={event => {
                const direction = fa ? -1 : 1;
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + direction + tabs.length) % tabs.length : event.key === 'ArrowLeft' ? (index - direction + tabs.length) % tabs.length : null;
                if (next !== null) { event.preventDefault(); setView(tabs[next].id); document.getElementById(`stt-assistant-tab-${tabs[next].id}`)?.focus(); }
              }} onClick={() => setView(tab.id)}><ChatIcon name={tab.icon}/>{tab.label}{tab.id === 'saved' && saved.length > 0 && <span>{saved.length}</span>}</button>)}
          </div><IconButton icon="settings" label={t('Assistant settings','تنظیمات دستیار')} aria-pressed={view === 'settings'} onClick={() => setView(view === 'settings' ? 'chat' : 'settings')}/></div>
          {view === 'chat' && <div id="stt-assistant-view-chat" role="tabpanel" aria-labelledby="stt-assistant-tab-chat" className="stt-assistant-chat-view">
            <div className="stt-assistant-context"><span><ChatIcon name="layers"/>{t('Current benchmark','بنچمارک فعلی')}</span><span>{rows.length} {t('outputs','خروجی')}<b>·</b>{scopeName}</span></div>
            <div ref={conversation} className="stt-assistant-conversation" role="log" aria-label={t('Chat messages','پیام‌های گفت‌وگو')} aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
              {messages.length === 0 ? <div className="stt-assistant-welcome"><div className="stt-assistant-emblem"><ChatIcon name="sparkles"/></div><span className="stt-assistant-eyebrow">{t('YOUR BENCHMARK, EXPLAINED','نتایج شما، روشن‌تر از همیشه')}</span><h3>{t('What do you want to compare?','چه چیزی را مقایسه کنیم؟')}</h3><p>{t('Start with a question. Use the current results to compare accuracy, speed and saved text reviews.', 'از یک سؤال شروع کنید؛ دقت، سرعت و ارزیابی‌های متنی را با داده‌های همین نما مقایسه کنید.')}</p>
                {showPrompts && <div className="stt-assistant-prompts">{prompts.map(prompt => <button type="button" key={prompt.icon} onClick={() => choosePrompt(prompt)}><ChatIcon name={prompt.icon}/><span><strong>{prompt.title}</strong><small>{prompt.subtitle}</small></span><ChatIcon name="arrow"/></button>)}</div>}
                <details className="stt-assistant-facts"><summary><ChatIcon name="chart"/>{t('Quick facts from this view','خلاصهٔ داده‌های این نما')}<ChatIcon name="chevron"/></summary><p data-reviewed-rows>{localFacts}</p></details>
              </div> : <><div className="stt-assistant-date">{t('This session','این نشست')}</div>{messages.map((message, index) => <div className={`stt-assistant-message ${message.role} ${message.error ? 'has-error' : ''}`} key={message.id}>
                <div className="stt-assistant-message-heading"><span className="stt-assistant-avatar"><ChatIcon name={message.role === 'user' ? 'user' : 'sparkles'}/></span><strong>{message.role === 'user' ? t('You','شما') : message.mode === 'openrouter' ? 'DeepSeek' : message.mode === 'preview' ? t('Sample assistant','دستیار نمونه') : t('Local data guide','راهنمای محلی داده')}</strong>{message.mode === 'preview' && <small>{t('Preview','پیش‌نمایش')}</small>}</div>
                <p dir="auto">{message.content}</p>{message.attachments?.map((name, i) => <span className="stt-assistant-file" key={i}><ChatIcon name="file"/><bdi>{name}</bdi><small>{t('Preview','پیش‌نمایش')}</small></span>)}
                <div className="stt-assistant-message-actions"><IconButton icon="copy" label={t('Copy message','کپی پیام')} onClick={() => copyText(message.content)}/>
                  {message.role === 'user' ? <IconButton icon="edit" label={t('Use this question again','استفادهٔ دوباره از سؤال')} disabled={busy} onClick={() => { setQuestion(message.content); input.current?.focus({preventScroll:true}); }}/>
                    : <><IconButton icon="bookmark" label={t('Save message','ذخیرهٔ پیام')} aria-pressed={saved.some(item => item.id === message.id)} onClick={() => setSaved(items => items.some(item => item.id === message.id) ? items.filter(item => item.id !== message.id) : [...items, message])}/><IconButton icon="like" label={t('Useful reply','پاسخ مفید')} aria-pressed={feedback[message.id] === 'up'} onClick={() => { setFeedback(items => ({...items, [message.id]:items[message.id] === 'up' ? null : 'up'})); preview(t('Feedback','بازخورد')); }}/><IconButton icon="dislike" label={t('Reply needs changes','پاسخ نیاز به اصلاح دارد')} aria-pressed={feedback[message.id] === 'down'} onClick={() => { setFeedback(items => ({...items, [message.id]:items[message.id] === 'down' ? null : 'down'})); preview(t('Feedback','بازخورد')); }}/><IconButton icon="speaker" label={t('Read aloud · preview','خواندن پاسخ · پیش‌نمایش')} onClick={() => preview(t('Read aloud','خواندن پاسخ'))}/>{index === messages.length - 1 && <IconButton icon="retry" label={t('Generate reply again','تولید دوبارهٔ پاسخ')} disabled={busy || (mode === 'openrouter' && !configured)} onClick={() => ask(null, messages[index - 1]?.content)}/>}</>}
                </div></div>)}</>}
              {busy && <div className="stt-assistant-thinking" role="status"><span><i/><i/><i/></span>{t('Preparing a reply…','در حال آماده‌کردن پاسخ…')}</div>}
            </div>
            <div className="stt-assistant-composer-area">
              {voice && <div className="stt-assistant-voice"><ChatIcon name="mic"/><span>{t('Voice input preview. The microphone is off.','پیش‌نمایش ورودی صوتی؛ میکروفن خاموش است.')}</span><IconButton icon="close" label={t('Close voice preview','بستن پیش‌نمایش صوتی')} onClick={() => setVoice(false)}/></div>}
              {mode === 'openrouter' && !configured && <button type="button" className="stt-assistant-key-hint" onClick={() => { setSettingsTab('connection'); setView('settings'); }}><ChatIcon name="key"/>{t('Load an API key to use this model','برای استفاده از این مدل، کلید API وارد کنید')}<ChatIcon name="arrow"/></button>}
              <form className="stt-assistant-composer" onSubmit={ask}>
                {files.length > 0 && <div className="stt-assistant-attachments">{files.map(file => <span key={file.id} className="stt-assistant-file"><ChatIcon name="file"/><bdi>{file.name}</bdi><small>{t('Preview','پیش‌نمایش')}</small><IconButton icon="close" label={t(`Remove ${file.name}`, `حذف ${file.name}`)} onClick={() => setFiles(items => items.filter(item => item.id !== file.id))}/></span>)}</div>}
                <label className="stt-visually-hidden" htmlFor="stt-chat-question">{t('Question about the benchmark','پرسش دربارهٔ بنچمارک')}</label><textarea id="stt-chat-question" ref={input} value={question} rows={2} maxLength={6000} dir="auto" placeholder={t('Ask about these results…','دربارهٔ این نتایج بپرسید…')} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(event); } }}/>
                <div className="stt-assistant-composer-tools"><div><IconButton icon="attach" label={t('Attach files · preview','پیوست فایل · پیش‌نمایش')} disabled={busy || files.length >= 5} onClick={() => fileInput.current?.click()}/><IconButton icon="globe" label={t('Web search · preview','جست‌وجوی وب · پیش‌نمایش')} onClick={() => preview(t('Web search','جست‌وجوی وب'))}/><IconButton icon="mic" label={t('Voice input · preview','ورودی صوتی · پیش‌نمایش')} aria-pressed={voice} onClick={() => setVoice(!voice)}/><button type="button" className="stt-assistant-context-toggle" aria-pressed={context} onClick={() => { setContext(!context); preview(t('Context selection','انتخاب داده‌های زمینه')); }}><ChatIcon name="layers"/><span>{t('Context','داده‌های نما')}</span>{context && <ChatIcon name="check"/>}</button></div>{busy ? <IconButton icon="stop" className="stt-assistant-send" label={t('Stop reply','توقف پاسخ')} onClick={stop}/> : <button className="stt-assistant-send" type="submit" aria-label={t('Send message','ارسال پیام')} title={t('Send message','ارسال پیام')} disabled={!question.trim() || (mode === 'openrouter' && !configured)}><ChatIcon name="send"/></button>}</div>
              </form><input ref={fileInput} type="file" multiple hidden tabIndex={-1} aria-label={t('Select preview files','انتخاب فایل برای پیش‌نمایش')} onChange={addFiles}/>
              <div className="stt-assistant-composer-note"><span><ChatIcon name="shield"/>{t('File, web and voice tools are previews','ابزارهای فایل، وب و صدا نمایشی هستند')}</span><span>{question.length > 5000 ? `${question.length}/6000` : t('Shift + Enter: new line','Shift + Enter: خط جدید')}</span></div>
            </div>
          </div>}
          {view === 'history' && <div id="stt-assistant-view-history" role="tabpanel" aria-labelledby="stt-assistant-tab-history" className="stt-assistant-secondary"><div className="stt-assistant-section-heading"><div><h3>{t('Chat history','تاریخچهٔ گفت‌وگوها')}</h3><p>{t('Chats stay in page memory until reload or a filter change.','گفت‌وگوها تا بارگذاری دوباره یا تغییر فیلتر، در حافظهٔ این صفحه می‌مانند.')}</p></div><IconButton icon="download" label={t('Export current chat','دریافت گفت‌وگوی فعلی')} onClick={exportChat}/></div><label className="stt-assistant-search"><ChatIcon name="search"/><span className="stt-visually-hidden">{t('Search chats','جست‌وجو در گفت‌وگوها')}</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Search chats…','جست‌وجو در گفت‌وگوها…')}/></label>
            {filteredChats.length ? <div className="stt-assistant-history-list">{filteredChats.map(item => <div key={item.id}><button type="button" onClick={() => restoreChat(item)}><ChatIcon name="chat"/><span><strong dir="auto">{item.title}</strong><small>{item.messages.length} {t('messages','پیام')}{item.id === chatId ? t(' · Current chat',' · گفت‌وگوی فعلی') : ''}</small></span><ChatIcon name="arrow"/></button><IconButton icon="trash" label={t('Delete chat','حذف گفت‌وگو')} onClick={() => { setHistory(items => items.filter(h => h.id !== item.id)); if (item.id === chatId) { stop(); setMessages([]); setChatId(makeId()); } }}/></div>)}</div> : <div className="stt-assistant-empty-state"><ChatIcon name="history"/><h3>{search ? t('No matches','نتیجه‌ای پیدا نشد') : t('Your next question starts here','گفت‌وگوی بعدی از اینجا شروع می‌شود')}</h3><p>{t('Start a chat to see it in this list.','با شروع یک گفت‌وگو، آن را در این فهرست می‌بینید.')}</p><button type="button" onClick={newChat}><ChatIcon name="plus"/>{t('New chat','گفت‌وگوی جدید')}</button></div>}
          </div>}
          {view === 'saved' && <div id="stt-assistant-view-saved" role="tabpanel" aria-labelledby="stt-assistant-tab-saved" className="stt-assistant-secondary"><div className="stt-assistant-section-heading"><div><h3>{t('Saved replies','پاسخ‌های ذخیره‌شده')}</h3><p>{t('Keep useful replies in this page session.','پاسخ‌های مفید را در نشست فعلی این صفحه نگه دارید.')}</p></div><ChatIcon name="bookmark"/></div>
            {saved.length ? saved.map(message => <div className="stt-assistant-saved-card" key={message.id}><p dir="auto">{message.content}</p><div><IconButton icon="copy" label={t('Copy message','کپی پیام')} onClick={() => copyText(message.content)}/><IconButton icon="trash" label={t('Remove saved reply','حذف پاسخ ذخیره‌شده')} onClick={() => setSaved(items => items.filter(item => item.id !== message.id))}/></div></div>) : <div className="stt-assistant-empty-state"><ChatIcon name="bookmark"/><h3>{t('Keep the useful parts','پاسخ‌های کاربردی را نگه دارید')}</h3><p>{t('Select the bookmark below a reply to save it here.','با انتخاب نشان ذخیره زیر هر پاسخ، آن را به اینجا اضافه کنید.')}</p></div>}
          </div>}
          {view === 'settings' && <div className="stt-assistant-secondary" aria-label={t('Assistant settings','تنظیمات دستیار')}><div className="stt-assistant-section-heading"><div><h3>{t('Make it yours','دستیار، به سلیقهٔ شما')}</h3><p>{t('Set the display and connection options.','نمایش و اتصال دستیار را تنظیم کنید.')}</p></div><IconButton icon="back" label={t('Back to chat','بازگشت به گفت‌وگو')} onClick={() => setView('chat')}/></div><div className="stt-assistant-settings-tabs"><button type="button" aria-pressed={settingsTab === 'preferences'} onClick={() => setSettingsTab('preferences')}>{t('Preferences','ترجیحات')}</button><button type="button" aria-pressed={settingsTab === 'connection'} onClick={() => setSettingsTab('connection')}>{t('Connection','اتصال')}</button></div>
            {settingsTab === 'preferences' ? <div className="stt-assistant-settings"><div className="stt-assistant-setting-row"><span><strong>{t('Suggested questions','سؤال‌های پیشنهادی')}</strong><small>{t('Show ideas at the start of a chat.','نمایش پیشنهادها در شروع گفت‌وگو.')}</small></span><button type="button" className="stt-assistant-switch" role="switch" aria-checked={showPrompts} aria-label={t('Suggested questions','سؤال‌های پیشنهادی')} onClick={() => setShowPrompts(!showPrompts)}><span/></button></div><div className="stt-assistant-setting-row"><span><strong>{t('Compact messages','پیام‌های فشرده')}</strong><small>{t('Use less space between messages.','فاصلهٔ بین پیام‌ها کمتر شود.')}</small></span><button type="button" className="stt-assistant-switch" role="switch" aria-checked={compact} aria-label={t('Compact messages','پیام‌های فشرده')} onClick={() => setCompact(!compact)}><span/></button></div><label className="stt-assistant-field"><span>{t('Reply length · preview','طول پاسخ · پیش‌نمایش')}</span><select value={length} onChange={event => { setLength(event.target.value); preview(t('Reply length','طول پاسخ')); }}><option value="short">{t('Short','کوتاه')}</option><option value="balanced">{t('Balanced','متعادل')}</option><option value="detailed">{t('Detailed','با جزئیات')}</option></select></label><div className="stt-assistant-preview-note"><ChatIcon name="sparkles"/><p>{t('Display controls work on this page. Model options, file analysis, web search, speech and feedback are previews.', 'کنترل‌های نمایش در همین صفحه کار می‌کنند. گزینه‌های مدل، تحلیل فایل، جست‌وجوی وب، صدا و بازخورد پیش‌نمایش هستند.')}</p></div><button type="button" className="stt-assistant-outline" onClick={exportChat}><ChatIcon name="download"/>{t('Export current chat','دریافت گفت‌وگوی فعلی')}</button></div>
              : <div className="stt-assistant-settings"><div className="stt-assistant-preview-note"><ChatIcon name="shield"/><p>{t('This is the existing optional OpenRouter connection. New preview tools do not use it.', 'این اتصال اختیاریِ فعلی به OpenRouter است. ابزارهای نمایشی جدید از آن استفاده نمی‌کنند.')}</p></div><label className="stt-assistant-field"><span>{t('Model','مدل')}</span><input value="deepseek/deepseek-v4-pro" readOnly dir="ltr"/></label><label className="stt-assistant-field"><span>{t('OpenRouter API key','کلید API در OpenRouter')}</span><input type="password" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} dir="ltr" placeholder="sk-or-…"/></label><p className="stt-assistant-help">{t('The key stays in local server memory. It is not saved in browser storage. Only Send calls OpenRouter with selected benchmark rows and recent messages.', 'کلید در حافظهٔ سرور محلی می‌ماند و در حافظهٔ مرورگر ذخیره نمی‌شود. فقط ارسال پیام، OpenRouter را با داده‌های انتخاب‌شده و پیام‌های اخیر فراخوانی می‌کند.')}</p><div className="stt-assistant-key-actions"><button type="button" disabled={!key.trim() || keyBusy} onClick={() => updateKey()}>{keyBusy ? t('Please wait…','لطفاً صبر کنید…') : t('Load key','استفاده از این کلید')}</button><button type="button" disabled={keyBusy} onClick={() => updateKey(true)}>{t('Clear active key','حذف کلید فعال')}</button></div><p className="stt-assistant-help" role="status">{configured ? t('Key available. API access has not been checked.','کلید موجود است؛ دسترسی API هنوز بررسی نشده است.') : t('No active key. Local mode is available.','کلید فعال وجود ندارد. حالت محلی در دسترس است.')}</p></div>}
          </div>}
          {notice && <div className="stt-assistant-notice" role="status"><ChatIcon name="info"/><span>{notice}</span><IconButton icon="close" label={t('Dismiss notice','بستن اعلان')} onClick={() => setNotice('')}/></div>}
          <div className="stt-assistant-footer"><span className="stt-assistant-footer-mark"><ChatIcon name="sparkles"/>STT BENCHMARK</span><button type="button" onClick={() => inform(t('Enter: send. Shift + Enter: new line. Escape: close. Use arrow keys to switch tabs.', 'Enter: ارسال. Shift + Enter: خط جدید. Escape: بستن. کلیدهای جهت: جابه‌جایی بین بخش‌ها.'))}><ChatIcon name="info"/>{t('Help','راهنما')}</button></div>
        </div>
      </DataComponent>
    </aside>}
  </div>;
}
