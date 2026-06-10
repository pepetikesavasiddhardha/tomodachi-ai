import React, { useState, useEffect } from 'react';
import { Database, Settings, Loader2, AlertTriangle, CheckCircle, Play, XCircle, Lock } from 'lucide-react';
import { setupElasticDatabase, setElasticConfig, getElasticConfig, hasEnvCredentials, initializeConfig } from '../services/elasticService';

interface AdminSetupProps {
    initialError?: string;
    onRetry?: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({ initialError, onRetry }) => {
    const [url, setUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [companionCount, setCompanionCount] = useState(50);
    const [eventCount, setEventCount] = useState(20);
    const [userCount, setUserCount] = useState(10);
    const [status, setStatus] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [envActive, setEnvActive] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            await initializeConfig();
            setEnvActive(hasEnvCredentials());
            
            const config = getElasticConfig();
            setUrl(config.url);
            setApiKey(config.apiKey);

            if (initialError) {
                const newStatus = [`❌ ${initialError}`];
                
                if (initialError.includes('Failed to fetch')) {
                    newStatus.push(
                        "⚠️ NETWORK/CORS ERROR DETECTED:",
                        "Your browser blocked the request to Elastic Cloud.",
                        "To fix this, you MUST enable CORS in your Elastic deployment.",
                        "If you already did this, TURN OFF YOUR ADBLOCKER (or Brave Shields) and ensure you are using the Elasticsearch URL, not Kibana."
                    );
                } else if (initialError.includes('credentials are missing') || initialError.includes('401')) {
                    newStatus.push(
                        "⚠️ CREDENTIALS MISSING OR INVALID:",
                        "Please enter your valid Elasticsearch URL and API Key below.",
                        "If you just chatted, you can click 'Save & Resume Search' after entering them!"
                    );
                }
                setStatus(newStatus);
            }
        };
        
        loadConfig();
    }, [initialError]);

    const handleSaveConfig = () => {
        setElasticConfig(url, apiKey);
        if (!onRetry) {
            setStatus(["Credentials saved successfully."]);
        }
    };

    const handleSeedData = async () => {
        if (!envActive) {
            setElasticConfig(url, apiKey);
        }
        setIsProcessing(true);
        setStatus(["Starting database initialization..."]);
        try {
            await setupElasticDatabase((msg) => {
                setStatus(prev => {
                    if (prev[prev.length - 1] === msg) return prev;
                    return [...prev, msg];
                });
            }, companionCount, eventCount, userCount);
        } catch (error: any) {
            const newStatus = [`❌ Error: ${error.message}`];
            
            if (error.message.includes('Failed to fetch')) {
                newStatus.push(
                    "⚠️ NETWORK/CORS ERROR DETECTED:",
                    "Your browser blocked the request to Elastic Cloud.",
                    "To fix this, you MUST enable CORS in your Elastic deployment.",
                    "If you already did this, TURN OFF YOUR ADBLOCKER (or Brave Shields) and ensure you are using the Elasticsearch URL, not Kibana."
                );
            }
            setStatus(newStatus);
        } finally {
            setIsProcessing(false);
        }
    };

    const isComplete = status.some(msg => msg.includes('Complete'));
    const isHighVolume = companionCount > 1000 || eventCount > 1000;
    const hasCorsError = status.some(msg => msg.includes('CORS ERROR DETECTED'));

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-warm-200 mt-10 mb-24">
            <div className="flex items-center space-x-3 mb-6 text-brand-700">
                <Settings className="w-8 h-8" />
                <h1 className="text-3xl font-bold">Elasticsearch Setup</h1>
            </div>
            
            {hasCorsError ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-r-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-4">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <h3 className="text-lg font-bold text-red-800">🚨 ACTION REQUIRED: Fix CORS in Elastic Cloud</h3>
                    </div>
                    <p className="text-red-700 mb-4">
                        Your browser is blocking the connection to your database. If you already edited your <code>elasticsearch.yml</code>, one of these is the problem:
                    </p>
                    <ol className="list-decimal list-inside text-red-800 space-y-2 mb-4 font-medium">
                        <li><b>Adblockers:</b> Turn off uBlock Origin, Privacy Badger, or Brave Shields for this page. They block database requests.</li>
                        <li><b>Wrong URL:</b> Ensure you copied the <b>Elasticsearch</b> URL, NOT the Kibana URL.</li>
                        <li><b>YAML Syntax:</b> Ensure you used <code>"/.*/"</code> for the origin and have NO spaces at the start of the lines in Elastic Cloud.</li>
                    </ol>
                    <pre className="bg-red-100 p-4 rounded-lg text-sm font-mono text-red-900 overflow-x-auto border border-red-200">
{`http.cors.enabled: true
http.cors.allow-origin: "/.*/"
http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE
http.cors.allow-headers: X-Requested-With, X-Auth-Token, Content-Type, Content-Length, Authorization, Access-Control-Allow-Headers, Accept`}
                    </pre>
                </div>
            ) : (
                !envActive && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-xl">
                        <div className="flex items-start">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-yellow-800">Environment File Not Detected</h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    We couldn't read your <code>.env</code> file automatically (local dev servers often block dotfiles). 
                                    We have created an <code>env.txt</code> file as a workaround. Please ensure your credentials are in <code>env.txt</code> and refresh the page.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            )}

            {envActive ? (
                <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-xl shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                        <Lock className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-bold text-green-800">Secured by Environment Variables</h3>
                    </div>
                    <p className="text-green-700">
                        Your Elasticsearch credentials are securely loaded from the <code>env.txt</code> or <code>.env</code> file. 
                        You do not need to enter them manually. End-users will have a seamless experience!
                    </p>
                    {onRetry && (
                        <button 
                            onClick={() => {
                                setStatus(["Retrying search..."]);
                                onRetry();
                            }}
                            className="mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
                        >
                            <Play className="w-5 h-5" />
                            <span>Resume Search</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Elasticsearch URL</label>
                        <input 
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your-cluster.es.us-central1.gcp.cloud.es.io"
                            className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Elastic API Key</label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Base64 encoded API Key"
                            className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    
                    {!onRetry ? (
                        <button 
                            onClick={handleSaveConfig}
                            className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-xl font-bold transition-colors"
                        >
                            Save Configuration
                        </button>
                    ) : (
                        <div className="mt-6 p-6 bg-brand-50 border border-brand-200 rounded-2xl">
                            <h3 className="text-lg font-bold text-brand-900 mb-2">Resume Your Search</h3>
                            <p className="text-brand-800 mb-4">
                                Your chat profile is saved! Enter your credentials above and click below to see your matches without chatting again.
                            </p>
                            <button 
                                onClick={() => {
                                    handleSaveConfig();
                                    setStatus(["Retrying search..."]);
                                    onRetry();
                                }}
                                disabled={!url || !apiKey}
                                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
                            >
                                <Play className="w-5 h-5" />
                                <span>Save & Resume Search</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="border-t border-warm-200 pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Database className="w-6 h-6 mr-2 text-brand-600" />
                    Generate & Seed Database
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    This will delete existing indices, create new ones with `dense_vector` mappings, dynamically generate the specified number of profiles/events, embed them via Gemini, and bulk insert them into Elastic.
                </p>
                
                {isHighVolume && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                        <p className="text-red-800 font-bold text-sm">⚠️ High Volume Warning</p>
                        <p className="text-red-700 text-xs mt-1">
                            Generating millions of records directly from a web browser is highly discouraged. You will likely hit <b>Google Gemini API Rate Limits (429)</b> and your browser tab may crash due to memory limits. The script uses batching to help, but for 1M+ records, a dedicated backend script is required. Proceed at your own risk!
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Companions</label>
                        <input 
                            type="number" 
                            min="1"
                            max="1000000"
                            value={companionCount}
                            onChange={(e) => setCompanionCount(parseInt(e.target.value) || 0)}
                            className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Events</label>
                        <input 
                            type="number" 
                            min="1"
                            max="1000000"
                            value={eventCount}
                            onChange={(e) => setEventCount(parseInt(e.target.value) || 0)}
                            className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Users (Logins)</label>
                        <input 
                            type="number" 
                            min="1"
                            max="100000"
                            value={userCount}
                            onChange={(e) => setUserCount(parseInt(e.target.value) || 0)}
                            className="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">user1@example.com / password123</p>
                    </div>
                </div>

                <button 
                    onClick={handleSeedData}
                    disabled={isProcessing || (!envActive && (!url || !apiKey))}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center space-x-2 w-full justify-center"
                >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                    <span>{isProcessing ? 'Generating & Indexing...' : 'Generate Data & Seed Elastic'}</span>
                </button>
            </div>

            {status.length > 0 && (
                <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm h-64 overflow-y-auto custom-scrollbar flex flex-col-reverse">
                    <div>
                        {status.map((msg, idx) => (
                            <div key={idx} className="mb-1">{msg}</div>
                        ))}
                    </div>
                </div>
            )}

            {isComplete && (
                <div className="mt-8 bg-green-50 border border-green-200 p-6 rounded-2xl">
                    <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <h3 className="text-xl font-bold text-green-800">Yes! You can view this data in Elastic UI</h3>
                    </div>
                    <p className="text-green-700 mb-4">
                        The data has been successfully inserted into your real Elasticsearch database. Here is how to view it:
                    </p>
                    <ol className="list-decimal list-inside text-green-800 space-y-3 ml-2">
                        <li>Go back to your Elastic Cloud console and open <b>Kibana</b>.</li>
                        <li>Open the left menu (☰), scroll down to <b>Management</b>, and click <b>Dev Tools</b>.</li>
                        <li>Paste the following query into the left panel and click the green play button:
                            <pre className="bg-green-100 p-3 rounded-lg mt-2 text-sm font-mono text-green-900 overflow-x-auto">
{`GET /tomodachi_users/_search
{
  "query": { "match_all": {} }
}`}
                            </pre>
                        </li>
                    </ol>
                </div>
            )}
        </div>
    );
};
