import React, { useState, useEffect } from 'react';
import { 
  Youtube, Search, RefreshCw, BarChart2, MessageSquare, 
  Sparkles, Send, Calendar, ThumbsUp, User, PieChart, 
  TrendingUp, Cloud, CheckCircle, HelpCircle, XCircle
} from 'lucide-react';
import './App.css';

// ReactBits Components
import Particles from './components/reactbits/Particles';
import CountUp from './components/reactbits/CountUp';
import BlurText from './components/reactbits/BlurText';
import ShinyText from './components/reactbits/ShinyText';
import SpotlightCard from './components/reactbits/SpotlightCard';
import AnimatedList from './components/reactbits/AnimatedList';
import ClickSpark from './components/reactbits/ClickSpark';
import StarBorder from './components/reactbits/StarBorder';

const API_BASE_URL = "http://localhost:5000";

function App() {
  // Manual analyzer state
  const [manualText, setManualText] = useState("");
  const [manualResult, setManualResult] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  // YouTube analyzer state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [commentsLimit, setCommentsLimit] = useState(100);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Scraped comments & predictions
  const [analyzedComments, setAnalyzedComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  // Chart blobs/urls
  const [pieChartUrl, setPieChartUrl] = useState(null);
  const [wordcloudUrl, setWordcloudUrl] = useState(null);
  const [trendGraphUrl, setTrendGraphUrl] = useState(null);

  // Active visualization tab
  const [activeVisTab, setActiveVisTab] = useState("pie");

  // Clean up object URLs when component unmounts or changes
  useEffect(() => {
    return () => {
      if (pieChartUrl) URL.revokeObjectURL(pieChartUrl);
      if (wordcloudUrl) URL.revokeObjectURL(wordcloudUrl);
      if (trendGraphUrl) URL.revokeObjectURL(trendGraphUrl);
    };
  }, [pieChartUrl, wordcloudUrl, trendGraphUrl]);

  // Handle manual analysis
  const handleManualAnalyze = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setManualLoading(true);
    setManualResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: [manualText] })
      });

      if (!response.ok) throw new Error("Backend server error");
      const data = await response.json();
      setManualResult(data[0]);
    } catch (err) {
      console.error(err);
      setManualResult({ error: "Could not predict sentiment. Is Flask running?" });
    } finally {
      setManualLoading(false);
    }
  };

  // Helper to fetch blob image from POST endpoint
  const fetchImageBlob = async (endpoint, payload) => {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Failed to generate ${endpoint}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Handle YouTube URL Analysis
  const handleYoutubeAnalyze = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setAnalyzeLoading(true);
    setErrorMessage("");
    setStats(null);
    setAnalyzedComments([]);
    
    // Revoke previous URLs
    if (pieChartUrl) URL.revokeObjectURL(pieChartUrl);
    if (wordcloudUrl) URL.revokeObjectURL(wordcloudUrl);
    if (trendGraphUrl) URL.revokeObjectURL(trendGraphUrl);
    setPieChartUrl(null);
    setWordcloudUrl(null);
    setTrendGraphUrl(null);

    try {
      // 1. Fetch comments from YouTube
      const fetchResponse = await fetch(`${API_BASE_URL}/fetch_comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: youtubeUrl, limit: parseInt(commentsLimit) })
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        throw new Error(errorData.error || "Failed to fetch YouTube comments");
      }

      const { comments } = await fetchResponse.json();
      if (!comments || comments.length === 0) {
        throw new Error("No comments were found for this video. Make sure the video is public and has comments enabled.");
      }

      // 2. Send comments for sentiment prediction
      const predictResponse = await fetch(`${API_BASE_URL}/predict_with_timestamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments })
      });

      if (!predictResponse.ok) throw new Error("Sentiment prediction failed");
      const predictions = await predictResponse.json();

      // Combine author and votes back into the predictions list
      const fullyAnalyzed = predictions.map((pred, idx) => ({
        ...pred,
        author: comments[idx].author,
        votes: comments[idx].votes
      }));

      setAnalyzedComments(fullyAnalyzed);

      // 3. Compute stats
      const total = fullyAnalyzed.length;
      const positive = fullyAnalyzed.filter(c => c.sentiment === "1").length;
      const neutral = fullyAnalyzed.filter(c => c.sentiment === "0").length;
      const negative = fullyAnalyzed.filter(c => c.sentiment === "-1").length;

      const sentimentCounts = { "1": positive, "0": neutral, "-1": negative };
      setStats({
        total,
        positive,
        neutral,
        negative,
        posPercent: ((positive / total) * 100).toFixed(1),
        neuPercent: ((neutral / total) * 100).toFixed(1),
        negPercent: ((negative / total) * 100).toFixed(1),
      });

      // 4. Fetch Visualization Images concurrently
      const commentsTextOnly = comments.map(c => c.text);
      const sentimentDataOnly = fullyAnalyzed.map(c => ({
        timestamp: c.timestamp,
        sentiment: parseInt(c.sentiment)
      }));

      try {
        const [pieUrl, wcUrl, trendUrl] = await Promise.all([
          fetchImageBlob("generate_chart", { sentiment_counts: sentimentCounts }),
          fetchImageBlob("generate_wordcloud", { comments: commentsTextOnly }),
          fetchImageBlob("generate_trend_graph", { sentiment_data: sentimentDataOnly })
        ]);
        setPieChartUrl(pieUrl);
        setWordcloudUrl(wcUrl);
        setTrendGraphUrl(trendUrl);
      } catch (visErr) {
        console.error("Visualizations error: ", visErr);
        // Don't fail the whole analysis if just charts fail
      }

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred. Make sure your Flask backend is running.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // Get sentiment label details
  const getSentimentDetails = (sentiment) => {
    switch (sentiment) {
      case "1":
        return { label: "Positive", badgeClass: "badge-positive", icon: <CheckCircle className="w-4 h-4" /> };
      case "0":
        return { label: "Neutral", badgeClass: "badge-neutral", icon: <HelpCircle className="w-4 h-4" /> };
      case "-1":
        return { label: "Negative", badgeClass: "badge-negative", icon: <XCircle className="w-4 h-4" /> };
      default:
        return { label: "Unknown", badgeClass: "badge-neutral", icon: null };
    }
  };

  // Filter comments based on search & sentiment
  const filteredComments = analyzedComments.filter(comment => {
    const matchesSearch = comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          comment.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || comment.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  // Map comments into beautiful animated elements
  const animatedCommentItems = filteredComments.map((item, idx) => {
    const sentiment = getSentimentDetails(item.sentiment);
    return (
      <div 
        key={idx} 
        className="p-3.5 rounded-lg bg-[#1F2937]/20 border border-gray-800/80 hover:border-gray-700/40 transition-all flex flex-col gap-2"
      >
        {/* Author, Likes, Time */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 font-medium text-gray-300">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            {item.author}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> {item.votes}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {item.timestamp.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Comment Text */}
        <p className="text-sm text-gray-200 leading-relaxed font-normal">
          {item.comment}
        </p>

        {/* Sentiment Label Badge */}
        <div className="flex justify-end">
          <span className={`badge ${sentiment.badgeClass} text-[11px] py-0.5 px-2.5`}>
            {sentiment.icon}
            {sentiment.label}
          </span>
        </div>
      </div>
    );
  });

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-white overflow-x-hidden">
      {/* Background Particles Wrapper */}
      <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen" style={{ width: '100vw', height: '100vh' }}>
        <Particles
          particleCount={180}
          particleSpread={10}
          speed={0.15}
          particleColors={['#6366f1', '#a855f7', '#ec4899', '#ffffff']}
          moveParticlesOnHover={true}
          particleHoverFactor={0.8}
          alphaParticles={true}
          particleBaseSize={80}
          sizeRandomness={0.7}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* ClickSpark Interactive Overlay */}
      <ClickSpark sparkColor="rgba(99, 102, 241, 0.7)" sparkSize={10} sparkRadius={22} sparkCount={10}>
        <div className="relative z-10 min-h-screen pt-4 pb-12 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in">
          {/* Header */}
          <header className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                <ShinyText text="Advanced NLP & MLOps System" speed={3} color="#818cf8" shineColor="#ffffff" />
              </span>
            </div>
            
            <div className="flex justify-center mb-3">
              <BlurText 
                text="YouTube Comment Sentiment Analyzer" 
                delay={80} 
                animateBy="words" 
                direction="top" 
                className="blur-text-gradient text-4xl md:text-6xl font-extrabold tracking-tight text-center"
              />
            </div>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Analyze real-time audience response, generate word clouds, and track sentiment trends powered by LightGBM and MLflow.
            </p>
          </header>

          {/* Grid: Url Input & Manual Input */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            
            {/* Left Card: YouTube Analyzer */}
            <SpotlightCard className="lg:col-span-2 glass-panel flex flex-col justify-between" spotlightColor="rgba(99, 102, 241, 0.12)">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Youtube className="text-red-500 w-7 h-7" />
                  Analyze YouTube Video Comments
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Paste a YouTube link below to scrape comments and run full sentiment analytics.
                </p>
                
                <form onSubmit={handleYoutubeAnalyze} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      YouTube Video Link
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="w-full bg-[#1F2937]/50 border border-gray-700/60 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Fetch Limit (Max Comments)
                      </label>
                      <select
                        value={commentsLimit}
                        onChange={(e) => setCommentsLimit(e.target.value)}
                        className="w-full bg-[#1F2937]/50 border border-gray-700/60 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="50">50 Comments</option>
                        <option value="100">100 Comments</option>
                        <option value="250">250 Comments</option>
                        <option value="500">500 Comments</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={analyzeLoading || !youtubeUrl}
                        className="w-full btn-primary flex items-center justify-center gap-2 h-[48px]"
                      >
                        {analyzeLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Analyzing Comments...
                          </>
                        ) : (
                          <>
                            <BarChart2 className="w-5 h-5" />
                            Analyze Sentiment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {errorMessage && (
                <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
                  <span className="font-bold">Error:</span> {errorMessage}
                </div>
              )}
            </SpotlightCard>

            {/* Right Card: Manual Predictor */}
            <StarBorder className="flex flex-col justify-between" innerClassName="p-6 h-full flex flex-col justify-between" color="#818cf8" speed="5s" thickness={2}>
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <MessageSquare className="text-indigo-400 w-6 h-6" />
                  Manual Tester
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Type custom comments below to check the model's prediction instantly.
                </p>

                <form onSubmit={handleManualAnalyze} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Test Sentiment Comment
                    </label>
                    <textarea
                      required
                      rows="3"
                      placeholder="Enter a custom comment here (e.g. 'I love this channel, it is super informative!')"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="w-full bg-[#1F2937]/50 border border-gray-700/60 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={manualLoading || !manualText.trim()}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {manualLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Analyze Comment
                  </button>
                </form>
              </div>

              {/* Manual Result display */}
              {manualResult && (
                <div className="mt-6 p-4 rounded-lg bg-gray-800/40 border border-gray-700/50 flex flex-col gap-3">
                  {manualResult.error ? (
                    <div className="text-red-400 text-sm">{manualResult.error}</div>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Prediction Result
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium italic text-gray-300">
                          "{manualResult.comment.slice(0, 30)}..."
                        </span>
                        <span className={`badge ${getSentimentDetails(manualResult.sentiment).badgeClass}`}>
                          {getSentimentDetails(manualResult.sentiment).icon}
                          {getSentimentDetails(manualResult.sentiment).label}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </StarBorder>
          </div>

          {/* Analytics Dashboard */}
          {stats && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Section Divider */}
              <div className="border-t border-gray-800 my-10"></div>
              
              <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Analytics Dashboard
              </h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SpotlightCard className="glass-panel text-center relative overflow-hidden group" spotlightColor="rgba(99, 102, 241, 0.15)">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Analyzed</div>
                  <div className="text-4xl font-extrabold text-white">
                    <CountUp to={stats.total} from={0} duration={1.5} />
                  </div>
                </SpotlightCard>
                
                <SpotlightCard className="glass-panel text-center relative overflow-hidden group border-emerald-500/10 hover:border-emerald-500/30" spotlightColor="rgba(16, 185, 129, 0.15)">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Positive
                  </div>
                  <div className="text-4xl font-extrabold text-emerald-400">
                    <CountUp to={parseFloat(stats.posPercent)} from={0} duration={1.5} />%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{stats.positive} comments</div>
                </SpotlightCard>

                <SpotlightCard className="glass-panel text-center relative overflow-hidden group border-gray-500/10 hover:border-gray-500/30" spotlightColor="rgba(156, 163, 175, 0.15)">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <HelpCircle className="w-4 h-4" /> Neutral
                  </div>
                  <div className="text-4xl font-extrabold text-gray-300">
                    <CountUp to={parseFloat(stats.neuPercent)} from={0} duration={1.5} />%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{stats.neutral} comments</div>
                </SpotlightCard>

                <SpotlightCard className="glass-panel text-center relative overflow-hidden group border-red-500/10 hover:border-red-500/30" spotlightColor="rgba(239, 68, 68, 0.15)">
                  <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4" /> Negative
                  </div>
                  <div className="text-4xl font-extrabold text-red-400">
                    <CountUp to={parseFloat(stats.negPercent)} from={0} duration={1.5} />%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{stats.negative} comments</div>
                </SpotlightCard>
              </div>

              {/* Grid: Visualizations & Comment Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Visualizations Card (Left Column) */}
                <SpotlightCard className="lg:col-span-3 glass-panel flex flex-col justify-between" spotlightColor="rgba(99, 102, 241, 0.08)">
                  <div>
                    <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <BarChart2 className="text-indigo-400" />
                        Visual Analytics
                      </h3>
                      
                      {/* Vis Tabs */}
                      <div className="flex bg-[#1F2937]/50 rounded-lg p-1 border border-gray-700/60">
                        <button
                          onClick={() => setActiveVisTab("pie")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                            activeVisTab === "pie" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <PieChart className="w-3.5 h-3.5" /> Sentiment
                        </button>
                        <button
                          onClick={() => setActiveVisTab("trend")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                            activeVisTab === "trend" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" /> Trend
                        </button>
                        <button
                          onClick={() => setActiveVisTab("wordcloud")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                            activeVisTab === "wordcloud" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Cloud className="w-3.5 h-3.5" /> Word Cloud
                        </button>
                      </div>
                    </div>

                    {/* Vis Render Container */}
                    <div className="bg-[#0B0F19]/50 rounded-xl border border-gray-800/80 p-4 min-h-[350px] flex items-center justify-center relative overflow-hidden">
                      
                      {/* Render Pie Chart */}
                      {activeVisTab === "pie" && (
                        pieChartUrl ? (
                          <img src={pieChartUrl} alt="Sentiment Distribution" className="max-h-[340px] object-contain animate-fade-in" />
                        ) : (
                          <div className="text-gray-500 text-sm flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            Generating chart...
                          </div>
                        )
                      )}

                      {/* Render Trend Graph */}
                      {activeVisTab === "trend" && (
                        trendGraphUrl ? (
                          <img src={trendGraphUrl} alt="Sentiment Trend Over Time" className="max-h-[340px] max-w-full object-contain animate-fade-in" />
                        ) : (
                          <div className="text-gray-500 text-sm flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            Generating trend graph...
                          </div>
                        )
                      )}

                      {/* Render Word Cloud */}
                      {activeVisTab === "wordcloud" && (
                        wordcloudUrl ? (
                          <img src={wordcloudUrl} alt="Comment Word Cloud" className="max-h-[340px] max-w-full object-contain animate-fade-in" />
                        ) : (
                          <div className="text-gray-500 text-sm flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            Generating word cloud...
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4 text-center">
                    Visualizations generated dynamically by Python backend using Matplotlib and WordCloud.
                  </div>
                </SpotlightCard>

                {/* Scraped Comments Feed (Right Column) */}
                <SpotlightCard className="lg:col-span-2 glass-panel flex flex-col" spotlightColor="rgba(99, 102, 241, 0.08)">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-4">
                    <MessageSquare className="text-indigo-400" />
                    Comments Stream
                  </h3>

                  {/* Feed Controls: Search & Sentiment Filter */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search comments or authors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-[#1F2937]/50 border border-gray-700/60 rounded-lg py-2 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    
                    <select
                      value={sentimentFilter}
                      onChange={(e) => setSentimentFilter(e.target.value)}
                      className="bg-[#1F2937]/50 border border-gray-700/60 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="all">All</option>
                      <option value="1">Positive</option>
                      <option value="0">Neutral</option>
                      <option value="-1">Negative</option>
                    </select>
                  </div>

                  {/* Comments Scroll Container */}
                  <div className="flex-1 overflow-hidden pr-1">
                    {filteredComments.length > 0 ? (
                      <AnimatedList
                        items={animatedCommentItems}
                        enableArrowNavigation={false}
                        showGradients={true}
                        displayScrollbar={true}
                        className="h-[360px]"
                      />
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-10 flex flex-col items-center justify-center h-[350px]">
                        <MessageSquare className="w-8 h-8 text-gray-600 mb-2" />
                        No comments match your search criteria.
                      </div>
                    )}
                  </div>
                </SpotlightCard>

              </div>

            </div>
          )}

          {/* Footer */}
          <footer className="mt-20 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
            <p>© 2026 YouTube Comment Sentiment Analyzer. All Rights Reserved.</p>
            <p className="mt-1">Developed by Ansh Singh • Driven by DVC, MLflow, LightGBM, and React.</p>
          </footer>
        </div>
      </ClickSpark>
    </div>
  );
}

export default App;
