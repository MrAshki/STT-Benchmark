# Local benchmark dashboard

The dashboard reads saved model outputs. It does not load or change model weights.

## Start

From the repository folder:

```powershell
& '.\.venv\Scripts\python.exe' dashboard_server.py
```

Open http://127.0.0.1:8765. Stop the server with Ctrl+C. It listens on this computer only.

## Explore

- Select models and a test category. All results use the same selected population. Speaker results remain available in the comparison table and chart.
- Select Raw, Orthography or Number-aware scoring.
- Compare weighted WER, CER, exact matches, processing time and real-time factor.
- Use Data exploration for the normalization chart and table, speaker comparison, and numeric value preservation. The combined normalization effect is raw WER minus number-aware WER, in percentage points. The insight below the table identifies the largest and smallest model-specific WER change for the current filters.
- Select a row in Outputs to inspect. Compare the reference with each model output. Expand the scored text for word alignment.
- Export CSV for the current filters. Use Full report for the saved detailed report.

WER is `100 * sum(S + D + I) / sum(N)`. It is not the mean of file WER values. Failed or missing outputs have no WER score. Each profile changes reference tokens; compare models within the same profile. Exact means an exact transcript after the selected transform. Time is the sum of median per-file inference times. Load and warmup time are excluded. Engines, device types and precision differ between models.

Saved semantic and style labels are Codex text judgments from one reviewer. They are not validated objective metrics. Only two people recorded the dataset. These results cannot establish general model quality or gender effects.

## Use another saved run

Input JSON must contain `models` and `records` (or `attempts`). Each model needs `id`, `name` and `backend`. Each result needs `id`, `model_id`, `category`, `speaker_id`, `duration_s`, `status`, `reference`, `prediction` and `inference_s`. `status: ok` means inference completed, including empty predictions. Reference text is the confirmed spoken script. Semantic and style labels are optional. Missing model/file pairs are added as missing results.

The importer rejects duplicate pairs, conflicting recording metadata, invalid durations and invalid review labels. It recomputes score counts from reference and prediction. It does not trust saved aggregate rates.

```powershell
& '.\.venv\Scripts\python.exe' tools\refresh_dashboard.py --source 'D:\path\evaluation.json'
& '.\.venv\Scripts\python.exe' dashboard_server.py --source 'D:\path\evaluation.json'
```

Refresh the browser after rebuilding. The build uses the installed Codex Data runtime. Pass `--node` and `--builder` if its location differs. The built dashboard in `dashboard/dist` can be served without that build runtime. Do not claim a fresh data import if no rebuild was made.

Audio playback uses `dataset[].source_path`. The detailed report link points to the saved report. It is not regenerated when you import another run.

## Assistant

Local data guide mode works without an API. It gives a fixed factual comparison for the current filters. It is not an LLM chat service.

Enable Use OpenRouter to ask the configured LLM. The server sends authoritative counts and outputs for the selected rows, plus recent chat messages. The API key stays in the project `.env` file as `OPENROUTER_API_KEY`. The model is `deepseek/deepseek-v4-pro`. No API request runs until Ask is selected in OpenRouter mode. API errors appear in the chat. The dashboard remains usable.

No database is required for this dataset. The source is JSON. Chat messages remain in page memory and are cleared on reload. Keep the server local. Do not publish the `.env`, personal audio or raw transcripts without review.

## Checks

```powershell
& '.\.venv\Scripts\python.exe' -m unittest test_dashboard -v
```


## Persian and English views

Use the globe menu to switch between English and Persian. The Persian view uses right-to-left content. Source transcripts, model names and score counts remain unchanged. Aggregate meaning and style labels follow the page language. Per-output review prose is omitted from transcript cards. Shared runtime menus and the full saved report retain their original language.

The file-level results table and transcript inspector are collapsed by default to reduce page length. Selecting a file-level row opens the transcript inspector at that recording. The inspector shows the unchanged reference, unchanged model output, word-error counts and an error table. Select All errors, Substitution, Deletion or Insertion to filter details. This does not change WER. Global model, category and scoring filters also apply. Error fragments use the selected scoring transform. An alignment group can contain several words. The minimum-edit alignment is not an acoustic diagnosis. The file-level table omits Saved review.

## Chat icon and API settings

Select the chat icon near the lower corner. Open Settings. Select OpenRouter, enter the API key, then select Load key. Return to the conversation and send a question. Loading the key does not call OpenRouter. The server keeps keys entered here in memory only. Clear active key disables the key for this server session. Restarting the server clears form-loaded keys; an existing project `.env` key is loaded again at startup.

API settings do not return the key to the browser. The password field clears after loading. No key is saved in browser storage or written to disk by this form. Chat history is held in page memory. A filter or scoring-profile change clears the conversation so old answers do not appear to describe a new population. Local facts mode works without API access.


## Assistant interface controls

The assistant has chat, history, saved replies and settings views. Suggested questions fill the message input. Enter sends the question. Shift + Enter adds a line. Escape returns from settings or closes the panel. The panel can expand on desktop screens.

New chat keeps the previous chat in page memory. History search, chat restore, reply bookmarks, text copy and text export work in the browser. Reloading the page or changing the benchmark filters, scoring profile or language clears the chats and saved replies. No chat is saved to disk or browser storage automatically.

File attachment, web search, voice input, read aloud, other models, response length, context selection and feedback are interface previews. These controls show a preview state. The file control retains file names only; it does not read or upload files. Voice preview does not use the microphone. The existing optional OpenRouter connection remains in Settings > Connection. No new server route is required.

## Animated chat robot

The chat launcher uses a local WebGL robot. Its head turns left and right. It needs no downloaded renderer or texture. Reduced-motion settings show a static pose. A fallback is available if WebGL cannot start.

The portable model is `dashboard/src/content/assets/robot-look-around.glb`. It has dark materials, emissive pink eyes and a head rotation animation. The live icon uses equivalent procedural geometry so no loader package is needed.

The scatter and heatmap keep plot geometry left to right in both languages. Short labels and angled category labels avoid collisions. A color scale explains heatmap values. Narrow cards can scroll inside the plot area.
