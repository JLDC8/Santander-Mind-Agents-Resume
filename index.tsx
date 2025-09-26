/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// FIX: Import React and ReactDOM to fix compilation errors.
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

const { useState, useCallback } = React;

type Tab = 'text' | 'audio';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [textInput, setTextInput] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalysis = useCallback(async () => {
    setLoading(true);
    setResult('');
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const model = 'gemini-2.5-flash';

      const prompt = `You are an expert meeting assistant for Santander Bank.
Analyze the following meeting content.
Summarize the key conclusions and list all actionable tasks.
Format the output clearly with "Conclusions:" and "Tasks:" headings. Use markdown for lists.`;

      let response;

      if (activeTab === 'text') {
        if (!textInput.trim()) {
            setError('Please enter some text to analyze.');
            setLoading(false);
            return;
        }
        response = await ai.models.generateContent({
            model,
            contents: [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: 'Understood. Please provide the meeting transcript.' }] },
                { role: 'user', parts: [{ text: textInput }] },
            ]
        });
      } else { // audio
        if (!audioFile) {
            setError('Please select an audio file to analyze.');
            setLoading(false);
            return;
        }
        const base64Audio = await fileToBase64(audioFile);
        const audioPart = {
            inlineData: {
                mimeType: audioFile.type,
                data: base64Audio,
            },
        };
        const textPart = { text: prompt };
        
        response = await ai.models.generateContent({
            model,
            contents: { parts: [audioPart, textPart] },
        });
      }

      setResult(response.text);

    } catch (e) {
      setError('An error occurred while analyzing. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, textInput, audioFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setError('');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <svg className="logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C11.5817 0 8 3.58172 8 8C8 10.893 9.6133 13.4028 12 14.9082V14.9102C12.8398 15.4287 13.6067 15.8276 14.32 16.1245C13.5658 17.0391 13.0498 18.1726 12.8438 19.3828C11.1396 18.9805 9.61035 18.0195 8.44141 16.666C7.30078 17.8438 6.51953 19.3379 6.21875 21H25.7812C25.4805 19.3379 24.6992 17.8438 23.5586 16.666C22.3896 18.0195 20.8604 18.9805 19.1562 19.3828C18.9502 18.1726 18.4342 17.0391 17.68 16.1245C18.3933 15.8276 19.1602 15.4287 20 14.9102V14.9082C22.3867 13.4028 24 10.893 24 8C24 3.58172 20.4183 0 16 0Z" fill="white"/>
            <path d="M6 23C6 24.6569 7.34315 26 9 26H23C24.6569 26 26 24.6569 26 23V22H6V23Z" fill="white"/>
            <rect x="6" y="27" width="20" height="5" rx="1" fill="white"/>
        </svg>
        <h1>Santander Mind Agents</h1>
      </header>
      <main>
        <div className="tabs">
          <button className={`tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')} role="tab" aria-selected={activeTab === 'text'}>
            Text Analysis
          </button>
          <button className={`tab ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')} role="tab" aria-selected={activeTab === 'audio'}>
            Audio Analysis
          </button>
        </div>

        <div id="text-content" className={`content ${activeTab === 'text' ? 'active' : ''}`} role="tabpanel">
          <div className="form-group">
            <label htmlFor="text-input">Meeting Transcript</label>
            <textarea
              id="text-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the text from your meeting here..."
            />
          </div>
          <button className="btn" onClick={handleAnalysis} disabled={loading || !textInput.trim()}>
            {loading ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </div>

        <div id="audio-content" className={`content ${activeTab === 'audio' ? 'active' : ''}`} role="tabpanel">
          <div className="form-group">
            <label htmlFor="audio-input">Meeting Audio File</label>
            <label htmlFor="audio-input" className="file-input-wrapper">
                <p>Click to browse or drag & drop a .wav file</p>
                {audioFile && <p className="file-name">{audioFile.name}</p>}
            </label>
            <input
              id="audio-input"
              type="file"
              accept="audio/wav"
              onChange={handleFileChange}
            />
          </div>
          <button className="btn" onClick={handleAnalysis} disabled={loading || !audioFile}>
            {loading ? 'Analyzing...' : 'Analyze Audio'}
          </button>
        </div>

        <div className="results" aria-live="polite">
          <h2>Results</h2>
          {loading && (
            <div className="loader">
              <div className="spinner"></div>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          {result && <pre>{result}</pre>}
          {!loading && !error && !result && <p>Your analysis results will appear here.</p>}
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
