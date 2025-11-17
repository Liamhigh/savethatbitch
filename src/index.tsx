
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// Helper to convert a file to a Gemini Part object.
const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const App = () => {
    const [prompt, setPrompt] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [textBrightness, setTextBrightness] = useState(100);
    const [logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setLogoSrc(savedLogo);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const hasImageFile = files.some(file => file.type.startsWith('image/'));
    const hasPdfFile = files.some(file => file.type === 'application/pdf');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files)]);
        }
    };
    
    const removeFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === 'image/png') {
                setError('');
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setLogoSrc(result);
                    localStorage.setItem('companyLogo', result);
                };
                reader.readAsDataURL(file);
            } else {
                setError('Please upload a PNG file for the logo.');
            }
        }
    };

    const removeLogo = () => {
        setLogoSrc(null);
        localStorage.removeItem('companyLogo');
    };

    const handleSubmit = async () => {
        if (!prompt && files.length === 0) {
            setError('Please provide a case description or upload evidence files.');
            return;
        }

        setLoading(true);
        setResult('');
        setError('');

        try {
            // FIX: Per coding guidelines, the API key must be obtained from `process.env.API_KEY`. This also resolves the TypeScript error.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const isComplex = (useThinkingMode || hasPdfFile) && !hasImageFile;
            const modelName = hasImageFile ? 'gemini-2.5-flash' : (isComplex ? 'gemini-2.5-pro' : 'gemini-2.5-flash');
            
            const systemInstruction = `You are Verum Omnis, a world-class forensic analysis engine. Your tone is severe, objective, and unflinching. Your task is to analyze the provided evidence (text, PDFs, images) and produce a detailed forensic and strategic report in Markdown format.

The report MUST include the following sections:
1.  **Executive Summary:** A brief, direct overview of the most critical findings.
2.  **Timeline of Events:** A chronological reconstruction of events based on the evidence.
3.  **Key People/Entities Involved:** Identification of all individuals or organizations and their roles.
4.  **Contradiction & Inconsistency Analysis:** Highlight any conflicting information, omissions, or behavioral red flags that indicate deception or misconduct.
5.  **Evidence Breakdown:** A summary of what each piece of evidence contributes to the case.
6.  **Potential Criminal & Civil Liabilities:** A stark assessment of potential legal exposure. Identify specific statutes that may have been violated. Detail potential fines, sanctions, and estimated criminal jail time based on the severity of the findings. This section must be direct and serve as a clear warning.
7.  **Strategic Recommendations - Legal Avenues:**
    *   **Criminal Strategy:** Outline concrete steps for engaging with law enforcement. Specify which agencies to contact (e.g., FBI, SEC, local police) and what information to provide.
    *   **Civil Strategy:** Detail potential civil claims (e.g., fraud, breach of contract), identify parties to sue, and state the objectives of litigation (e.g., recovering damages, seeking injunctions).
8.  **Strategic Recommendations - Communications:**
    *   **Draft Communications:** Provide pre-drafted emails or letters for key stakeholders (e.g., opposing counsel, internal compliance, law enforcement). For each communication, you must specify the intended recipient, the strategic purpose, and the key message to convey.
9.  **Conclusion:** Your final, authoritative assessment of the situation.

Analyze the following documents and images with extreme prejudice and deliver your report.`;
            
            const userPrompt = `The user has provided the following context or question: "${prompt || 'No specific question provided.'}"`;

            const parts: any[] = [{ text: userPrompt }];

            for (const file of files) {
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    parts.push(await fileToGenerativePart(file));
                } else if (file.type.startsWith('text/')) {
                    const text = await file.text();
                    parts.push({ text: `\n--- Evidence File: ${file.name} ---\n${text}`});
                }
            }
            
            const config: any = {
                systemInstruction: systemInstruction,
            };
            if (isComplex) {
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts: parts },
                config: config,
            });

            setResult(response.text);

        } catch (err) {
            console.error(err);
            const errorMessage = (err instanceof Error) ? err.message : 'An error occurred while processing your request.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const handleGeneratePdf = async () => {
        if (!result) return;
        
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();

        const contentElement = document.createElement('div');
        contentElement.innerHTML = (window as any).marked.parse(result);
        
        // Apply text brightness to PDF content
        const pdfTextColor = `hsl(0, 0%, ${textBrightness * 0.82}%)`;
        contentElement.style.color = pdfTextColor;

        doc.setFontSize(18);
        doc.text('Verum Omnis - Forensic Report', 14, 22);
        
        await doc.html(contentElement, {
            callback: async function (doc) {
                // Cryptographic Seal
                const content = doc.output('arraybuffer');
                const hashBuffer = await crypto.subtle.digest('SHA-256', content);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                const pageCount = doc.internal.getNumberOfPages();
                doc.setPage(pageCount);
                doc.setFontSize(8);
                doc.setTextColor(100);
                const sealText = `Cryptographic Seal (SHA-256): ${hashHex}\nGenerated: ${new Date().toISOString()}`;
                doc.text(sealText, 14, doc.internal.pageSize.height - 10);
                
                doc.save(`Verum-Omnis-Report-${Date.now()}.pdf`);
            },
            x: 15,
            y: 35,
            width: 180,
            windowWidth: 800
        });
    };

    const renderMarkdown = (text) => {
        if ((window as any).marked) {
            return { __html: (window as any).marked.parse(text, { breaks: true, gfm: true }) };
        }
        return { __html: text.replace(/\n/g, '<br />') };
    };

    return (
        <>
            {logoSrc && <img src={logoSrc} className="company-logo" alt="Company Logo" />}
            <div style={styles.container} aria-live="polite" aria-busy={loading}>
                <h1 style={styles.title}>Verum Omnis - Forensic Engine</h1>
                
                <div style={{...styles.inputSection, opacity: isOffline ? 0.7 : 1, transition: 'opacity 0.3s ease-in-out'}}>
                    {isOffline && (
                        <div style={styles.offlineBanner} role="status">
                            You are currently offline. Analysis requires an internet connection.
                        </div>
                    )}
                    
                    <label htmlFor="logo-upload" style={styles.label}>Company Logo (PNG only)</label>
                    <div style={styles.logoControls}>
                        <label htmlFor="logo-upload" style={{...styles.fileInputLabel, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1}}>
                            {logoSrc ? 'Change Logo...' : 'Upload Logo...'}
                        </label>
                        <input
                            id="logo-upload"
                            type="file"
                            accept="image/png"
                            onChange={handleLogoChange}
                            style={{ display: 'none' }}
                            disabled={loading}
                        />
                        {logoSrc && (
                            <button onClick={removeLogo} style={styles.removeLogoButton} disabled={loading}>
                                Remove Logo
                            </button>
                        )}
                    </div>

                    <label htmlFor="prompt-textarea" style={styles.label}>Case Name / Primary Question</label>
                    <textarea
                        id="prompt-textarea"
                        style={styles.textarea}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Provide context for your case, or ask a specific question..."
                        rows={3}
                        disabled={loading}
                    />
                    
                    <label htmlFor="file-upload" style={styles.label}>Upload Evidence</label>
                    <div style={styles.fileInputContainer}>
                         <label htmlFor="file-upload" style={{...styles.fileInputLabel, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1}}>
                            Add Files...
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept="image/*,text/plain,application/pdf"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            disabled={loading}
                            multiple
                        />
                    </div>

                    {files.length > 0 && (
                        <div style={styles.fileList}>
                            {files.map((file, index) => (
                                <div key={index} style={styles.fileChip}>
                                    <span>{file.name}</span>
                                    <button onClick={() => removeFile(index)} style={styles.removeFileButton} disabled={loading}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div style={styles.controls}>
                        <div style={styles.checkboxContainer}>
                             <input
                                type="checkbox"
                                id="thinking-mode"
                                checked={useThinkingMode}
                                onChange={(e) => setUseThinkingMode(e.target.checked)}
                                disabled={loading || hasImageFile}
                            />
                            <label htmlFor="thinking-mode" style={{opacity: (loading || hasImageFile) ? 0.5 : 1, cursor: (loading || hasImageFile) ? 'not-allowed' : 'pointer'}}>Think More (for complex queries)</label>
                        </div>
                         <button 
                            onClick={handleSubmit} 
                            disabled={loading || isOffline} 
                            style={{
                                ...styles.button, 
                                cursor: loading ? 'wait' : (isOffline ? 'not-allowed' : 'pointer'),
                                backgroundColor: isOffline ? '#555' : styles.button.backgroundColor,
                                opacity: isOffline ? 0.7 : 1,
                            }}
                         >
                            {loading ? <span style={styles.spinner} role="status" aria-label="Analyzing..."></span> : (isOffline ? 'Analysis Unavailable Offline' : 'Analyze Case')}
                        </button>
                    </div>
                </div>

                {error && <div style={styles.error} role="alert">{error}</div>}

                {result && (
                    <section style={styles.resultSection} aria-labelledby="result-title">
                         <div style={styles.resultHeader}>
                            <h2 id="result-title" style={styles.resultTitle}>Forensic Report</h2>
                            <div style={styles.resultHeaderControls}>
                                <div style={styles.brightnessControl}>
                                    <label htmlFor="brightness-slider" style={styles.brightnessLabel}>Text Brightness</label>
                                    <input
                                        id="brightness-slider"
                                        type="range"
                                        min="40"
                                        max="100"
                                        value={textBrightness}
                                        onChange={(e) => setTextBrightness(parseInt(e.target.value, 10))}
                                        className="brightness-slider"
                                        aria-label="Adjust text brightness"
                                    />
                                </div>
                                <button onClick={handleGeneratePdf} style={styles.pdfButton}>Download Sealed PDF</button>
                            </div>
                        </div>
                        <div 
                            className="result-content" 
                            style={{
                                ...styles.resultContent,
                                // #d1d1d1 is ~82% lightness. We scale this based on the slider.
                                color: `hsl(0, 0%, ${textBrightness * 0.82}%)` 
                            }} 
                            dangerouslySetInnerHTML={renderMarkdown(result)} 
                        />
                    </section>
                )}
            </div>
        </>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' },
    title: { fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', textAlign: 'center', margin: 0, color: '#e0e0e0' },
    inputSection: { backgroundColor: '#1c1c1c', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '16px' },
    offlineBanner: { backgroundColor: '#4a2c2c', color: '#ffc1c1', padding: '12px', borderRadius: '4px', border: '1px solid #8b0000', textAlign: 'center', fontSize: '0.9rem' },
    label: { fontWeight: 500, fontSize: '0.9rem', color: '#a0a0a0' },
    textarea: { width: '100%', boxSizing: 'border-box', backgroundColor: '#222', color: '#d1d1d1', border: '1px solid #333', borderRadius: '4px', padding: '12px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' },
    controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '10px' },
    logoControls: { display: 'flex', alignItems: 'center', gap: '12px' },
    removeLogoButton: { backgroundColor: '#8B3A3A', color: 'white', border: '1px solid #A54D4D', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', transition: 'background-color 0.2s', whiteSpace: 'nowrap' },
    fileInputContainer: {},
    fileInputLabel: { backgroundColor: '#3a3a3a', color: '#e0e0e0', padding: '10px 15px', borderRadius: '4px', display: 'inline-block', transition: 'background-color 0.2s' },
    fileList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
    fileChip: { backgroundColor: '#3a3a3a', color: '#d1d1d1', padding: '5px 10px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    removeFileButton: { background: '#4f4f4f', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, lineHeight: 1 },
    checkboxContainer: { display: 'flex', alignItems: 'center', gap: '8px' },
    button: { backgroundColor: '#2c5b8a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '130px', minHeight: '44px', transition: 'background-color 0.2s', fontWeight: 500 },
    pdfButton: { backgroundColor: '#215724', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.2s' },
    spinner: { border: '3px solid rgba(255, 255, 255, 0.3)', borderTop: '3px solid #fff', borderRadius: '50%', width: '18px', height: '18px', animation: 'spin 1s linear infinite' },
    error: { backgroundColor: '#401a1a', color: '#f5c6cb', padding: '12px', borderRadius: '4px', border: '1px solid #721c24' },
    resultSection: { backgroundColor: '#1c1c1c', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', marginTop: '8px' },
    resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #2a2a2a', paddingBottom: '12px', marginBottom: '12px' },
    resultHeaderControls: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
    brightnessControl: { display: 'flex', alignItems: 'center', gap: '10px' },
    brightnessLabel: { fontSize: '0.9rem', color: '#a0a0a0', whiteSpace: 'nowrap' },
    resultTitle: { margin: 0, color: '#e0e0e0' },
    resultContent: { lineHeight: 1.6, wordWrap: 'break-word', color: '#d1d1d1' }
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
