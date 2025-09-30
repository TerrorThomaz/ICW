"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import React from 'react';

interface StimulusItem {
  x: number;
  y: number;
  isTarget: boolean;
  color: string;
  symbol: '/' | '\\';
}

interface ColorConfig {
  name: string;
  value: string;
}

const VisualSearchGeneratorStandalone = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Visual search settings
  const [distractorCount, setDistractorCount] = useState(20);
  const [targetSlashCount, setTargetSlashCount] = useState(3);
  const [hasTarget] = useState(true); // removed unused setter
  const [stimulusSize, setStimulusSize] = useState(600);
  const [fontSize, setFontSize] = useState(24);
  const [currentStimuli, setCurrentStimuli] = useState<StimulusItem[]>([]);

  // Color configuration
  const availableColors: ColorConfig[] = [
    { name: 'Green', value: 'hsl(162, 73%, 46%)' },
    { name: 'Red', value: 'hsl(0, 73%, 57%)' },
    { name: 'Blue', value: 'hsl(221, 83%, 53%)' },
    { name: 'Yellow', value: 'hsl(43, 96%, 56%)' },
    { name: 'Purple', value: 'hsl(270, 50%, 40%)' },
    { name: 'Orange', value: 'hsl(15, 86%, 50%)' },
    { name: 'Grey', value: 'hsl(210, 11%, 30%)' },
    { name: 'Cyan', value: 'hsl(180, 73%, 46%)' },
    { name: 'Pink', value: 'hsl(330, 73%, 57%)' }
  ];

  const [correctTargetColor, setCorrectTargetColor] = useState('hsl(162, 73%, 46%)'); // Green
  const [selectedDistractorColors, setSelectedDistractorColors] = useState([
    'hsl(210, 11%, 30%)', 'hsl(270, 50%, 40%)', 'hsl(15, 86%, 50%)'
  ]);
  const [selectedFalseTargetColors, setSelectedFalseTargetColors] = useState([
    'hsl(0, 73%, 57%)', 'hsl(221, 83%, 53%)', 'hsl(43, 96%, 56%)'
  ]);

  // New state for repeated trials
  const [repeatPercentage, setRepeatPercentage] = useState(20); // e.g., 20% repeats
  const [pregeneratedStimulus, setPregeneratedStimulus] = useState<StimulusItem[] | null>(null);
  const [lastStimulusWasRepeat, setLastStimulusWasRepeat] = useState(false);

  // Timing and results
  const [trialStartTime, setTrialStartTime] = useState<number | null>(null);
  const [results, setResults] = useState<
    { 
      config: {
        distractorCount: number,
        targetSlashCount: number,
        stimulusSize: number,
        fontSize: number,
        correctTargetColor: string,
        selectedDistractorColors: string[],
        selectedFalseTargetColors: string[],
        repeatPercentage: number,
        fixationDuration: number
      },
      isRepeat: boolean, 
      timeMs: number, 

    }[]
  >([]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fixation cross state
  const [showFixation, setShowFixation] = useState(false);
  const [fixationDuration, setFixationDuration] = useState(1000); // ms

  // Experiment control states
  const [totalTrials, setTotalTrials] = useState(30); // default 30 trials
  const [trialNumber, setTrialNumber] = useState(0);
  const [experimentActive, setExperimentActive] = useState(false);

  // Add state for control panel visibility
  const [showControls, setShowControls] = useState(true);

  const distractorColors = selectedDistractorColors;
  const targetColor = correctTargetColor;
  const falseTargetColors = selectedFalseTargetColors;

  const generateStimuli = useCallback(() => {
    const stimuli: StimulusItem[] = [];
    const padding = 40;
    const maxAttempts = 1000;

    // Generate distractors (\)
    for (let i = 0; i < distractorCount; i++) {
      let attempts = 0;
      let validPosition = false;
      let x: number, y: number;

      while (!validPosition && attempts < maxAttempts) {
        x = Math.random() * (stimulusSize - 2 * padding) + padding;
        y = Math.random() * (stimulusSize - 2 * padding) + padding;

        // Check if position overlaps with existing stimuli
        validPosition = stimuli.every(stimulus => {
          const distance = Math.sqrt((x - stimulus.x) ** 2 + (y - stimulus.y) ** 2);
          return distance > fontSize * 1.5;
        });

        attempts++;
      }

      if (validPosition) {
        stimuli.push({
          x: x!,
          y: y!,
          isTarget: false,
          color: distractorColors[Math.floor(Math.random() * distractorColors.length)],
          symbol: '\\'
        });
      }
    }

    // Generate target slashes (/) - only one green is correct, others are false targets
    if (hasTarget) {
      for (let i = 0; i < targetSlashCount; i++) {
        let attempts = 0;
        let validPosition = false;
        let x: number, y: number;

        while (!validPosition && attempts < maxAttempts) {
          x = Math.random() * (stimulusSize - 2 * padding) + padding;
          y = Math.random() * (stimulusSize - 2 * padding) + padding;

          validPosition = stimuli.every(stimulus => {
            const distance = Math.sqrt((x - stimulus.x) ** 2 + (y - stimulus.y) ** 2);
            return distance > fontSize * 1.5;
          });

          attempts++;
        }

        if (validPosition) {
          // First slash is the correct green target, others are false targets
          const isCorrectTarget = i === 0;
          stimuli.push({
            x: x!,
            y: y!,
            isTarget: isCorrectTarget,
            color: isCorrectTarget ? targetColor : falseTargetColors[i % falseTargetColors.length],
            symbol: '/'
          });
        }
      }
    }

    setCurrentStimuli(stimuli);
    return stimuli;
  }, [distractorCount, targetSlashCount, hasTarget, stimulusSize, fontSize, distractorColors, targetColor, falseTargetColors]);

  const drawStimuli = useCallback((stimuli: StimulusItem[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.fillRect(0, 0, stimulusSize, stimulusSize);

    // Draw stimuli
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    stimuli.forEach(stimulus => {
      ctx.fillStyle = stimulus.color;
      ctx.fillText(stimulus.symbol, stimulus.x, stimulus.y);
    });
  }, [stimulusSize, fontSize]);

  // Generate and store a pregenerated stimulus for repeats
  const generatePregeneratedStimulus = useCallback(() => {
    const stimuli = generateStimuli();
    setPregeneratedStimulus(stimuli);
  }, [generateStimuli]);

  // Fullscreen helpers
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    setIsFullscreen(true);
  };
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    setIsFullscreen(false);
  };
  const enterCanvasFullscreen = () => {
    if (canvasRef.current && canvasRef.current.requestFullscreen) {
      canvasRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  };
  const exitCanvasFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    setIsFullscreen(false);
  };

  // Modified generateNewStimulus to show fixation cross first
  const generateNewStimulus = () => {
    setShowFixation(true);
    setTimeout(() => {
      setShowFixation(false);
      let useRepeat = false;
      if (pregeneratedStimulus && Math.random() < repeatPercentage / 100) {
        drawStimuli(pregeneratedStimulus);
        setCurrentStimuli(pregeneratedStimulus);
        useRepeat = true;
      } else {
        const stimuli = generateStimuli();
        drawStimuli(stimuli);
        setCurrentStimuli(stimuli);
        useRepeat = false;
      }
      setLastStimulusWasRepeat(useRepeat);
      setTrialStartTime(Date.now());
    }, fixationDuration);
  };

  // Call this to start a new block or experiment
  const startExperiment = () => {
    generatePregeneratedStimulus();
    setResults([]);
    setTrialNumber(0);
    setExperimentActive(true);
    enterCanvasFullscreen();
    generateNewStimulus();
  };

  // Call this when the subject finds the target (button click)
  const handleFoundTarget = () => {
    if (trialStartTime && experimentActive) {
      const timeMs = Date.now() - trialStartTime;
      setResults(prev => [
        ...prev,
        {
          config: {
        distractorCount,
        targetSlashCount,
        stimulusSize,
        fontSize,
        correctTargetColor,
        selectedDistractorColors,
        selectedFalseTargetColors,
        repeatPercentage,
        fixationDuration
      },
          isRepeat: lastStimulusWasRepeat,
          timeMs,

        }
      ]);
      if (trialNumber + 1 >= totalTrials) {
        setExperimentActive(false);
        exitCanvasFullscreen();
        // Optionally show a message or results
      } else {
        setTrialNumber(trialNumber + 1);
        generateNewStimulus();
      }
    }
  };

  // Download results as CSV
  const downloadResultsCSV = () => {
    if (results.length === 0) return;
    // Flatten stimuli for CSV
    const csvRows = [
      'trial,isRepeat,timeMs,stimulusIndex,symbol,isTarget,color,x,y'
    ];
 
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visual-search-results-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download results as JSON (optional)
  const downloadResultsJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visual-search-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Fixation cross drawing
  const drawFixationCross = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, stimulusSize, stimulusSize);
    ctx.fillStyle = 'hsl(0, 0%, 95%)';
    ctx.fillRect(0, 0, stimulusSize, stimulusSize);
    ctx.font = `${Math.round(fontSize * 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#222';
    ctx.fillText('X', stimulusSize / 2, stimulusSize / 2);
  };

  // Show fixation cross when needed
  useEffect(() => {
    if (showFixation) {
      drawFixationCross();
    }
  }, [showFixation, stimulusSize, fontSize]);

  // Generate initial stimulus on mount
  useEffect(() => {
    const stimuli = generateStimuli();
    drawStimuli(stimuli);
  }, [generateStimuli, drawStimuli]);

  // Regenerate when settings change
  useEffect(() => {
    const stimuli = generateStimuli();
    drawStimuli(stimuli);
  }, [distractorCount, targetSlashCount, hasTarget, stimulusSize, fontSize, distractorColors, targetColor, falseTargetColors, generateStimuli, drawStimuli]);

  // Optionally exit fullscreen on unmount
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) exitFullscreen();
    };
    // eslint-disable-next-line
  }, []);

  // Handle space key to indicate target found
  useEffect(() => {
    if (!isFullscreen || !experimentActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only allow during experiment, not during fixation
      if (!showFixation && e.code === "Space") {
        e.preventDefault();
        handleFoundTarget();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, experimentActive, showFixation, handleFoundTarget]);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '16px',
      fontFamily: 'Arial, sans-serif'
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '32px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#666',
      fontSize: '16px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '24px',
      '@media (maxWidth: 768px)': {
        gridTemplateColumns: '1fr'
      }
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '16px',
      color: '#333'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      marginBottom: '4px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      marginRight: '8px'
    },
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      marginRight: '8px'
    },
    canvas: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      maxWidth: '100%',
      height: 'auto',
      backgroundColor: 'hsl(0, 0%, 95%)'
    },
    separator: {
      height: '1px',
      backgroundColor: '#e5e7eb',
      margin: '16px 0'
    },
    stats: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      fontSize: '12px',
      color: '#666',
      marginTop: '16px',
      flexWrap: 'wrap' as const
    },
    centerContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center'
    }
  };

  function downloadImage(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `visual-search-stimulus-${Date.now()}.png`;
    link.click();
  }
  function downloadConfig(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    const config = {
      distractorCount,
      targetSlashCount,
      stimulusSize,
      fontSize,
      correctTargetColor,
      selectedDistractorColors,
      selectedFalseTargetColors,
      repeatPercentage,
      fixationDuration
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visual-search-config-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.header}>
          <h1 style={styles.title}>Visual Search Stimulus Generator</h1>
          <p style={styles.subtitle}>
            Generate customizable visual search stimuli with colors and spatial arrangement
          </p>
        </div>
        {/* Toggle and Start Experiment buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          {!experimentActive && (
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setShowControls((prev) => !prev)}
            >
              {showControls ? 'Hide Settings' : 'Show Settings'}
            </button>
          )}
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={startExperiment}
            disabled={experimentActive}
          >
            Start Experiment (Fullscreen)
          </button>
        </div>
        <div style={styles.grid}>
          {/* Controls Panel */}
          {showControls && !experimentActive && (
            <div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>⚙️ Stimulus Settings</h2>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Distractor Count</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={distractorCount}
                    onChange={(e) => setDistractorCount(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="100"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Target Slash Count</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={targetSlashCount}
                    onChange={(e) => setTargetSlashCount(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="20"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Canvas Size (px)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={stimulusSize}
                    onChange={(e) => setStimulusSize(Math.max(200, parseInt(e.target.value) || 200))}
                    min="200"
                    max="1000"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Font Size (px)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.max(12, parseInt(e.target.value) || 12))}
                    min="12"
                    max="48"
                  />
                </div>

                <div style={styles.separator}></div>

                {/* Color Configuration */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Target Color (Green {"/"} symbol)</label>
                  <select 
                    style={styles.select}
                    value={correctTargetColor} 
                    onChange={(e) => setCorrectTargetColor(e.target.value)}
                  >
                    {availableColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Distractor Colors ({'\\'} symbols)</label>
                  {selectedDistractorColors.map((color, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <select 
                        style={styles.select}
                        value={color} 
                        onChange={(e) => {
                          const newColors = [...selectedDistractorColors];
                          newColors[index] = e.target.value;
                          setSelectedDistractorColors(newColors);
                        }}
                      >
                        {availableColors.map((colorOption) => (
                          <option key={colorOption.value} value={colorOption.value}>
                            {colorOption.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>False Target Colors (Non-green {"/"} symbols)</label>
                  {selectedFalseTargetColors.map((color, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      <select 
                        style={styles.select}
                        value={color} 
                        onChange={(e) => {
                          const newColors = [...selectedFalseTargetColors];
                          newColors[index] = e.target.value;
                          setSelectedFalseTargetColors(newColors);
                        }}
                      >
                        {availableColors.map((colorOption) => (
                          <option key={colorOption.value} value={colorOption.value}>
                            {colorOption.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={styles.separator}></div>

                <button 
                  style={{...styles.button, ...styles.primaryButton, width: '100%', marginBottom: '8px'}}
                  onClick={generateNewStimulus}
                >
                  🔀 Generate New
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    style={{...styles.button, ...styles.secondaryButton, flex: '1'}}
                    onClick={downloadImage}
                  >
                    📥 Download Image
                  </button>
                  <button 
                    style={{...styles.button, ...styles.secondaryButton, flex: '1'}}
                    onClick={downloadConfig}
                  >
                    📥 Download Config
                  </button>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Repeat Percentage (%)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={repeatPercentage}
                    onChange={(e) => setRepeatPercentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    min="0"
                    max="100"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fixation Cross Duration (ms)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={fixationDuration}
                    onChange={(e) => setFixationDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="5000"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Number of Trials</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={totalTrials}
                    onChange={e => setTotalTrials(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="1000"
                  />
                </div>
                <button 
                  style={{...styles.button, ...styles.primaryButton, width: '100%', marginBottom: '8px'}}
                  onClick={startExperiment}
                >
                  Start Experiment (Fullscreen)
                </button>
                
                <button 
                  style={{...styles.button, ...styles.secondaryButton, width: '100%', marginBottom: '8px'}}
                  onClick={downloadResultsCSV}
                >
                  Download Results (CSV)
                </button>
                <button 
                  style={{...styles.button, ...styles.secondaryButton, width: '100%', marginBottom: '8px'}}
                  onClick={downloadResultsJSON}
                >
                  Download Results (JSON)
                </button>
              </div>
            </div>
          )}

          {/* Canvas Display */}
          <div>
            <div style={styles.card}>
              <div style={styles.centerContent}>
                <canvas
                  ref={canvasRef}
                  width={stimulusSize}
                  height={stimulusSize}
                  style={{
                    ...styles.canvas,
                    width: isFullscreen ? '100vw' : undefined,
                    height: isFullscreen ? '100vh' : undefined,
                    maxWidth: isFullscreen ? '100vw' : '100%',
                    maxHeight: isFullscreen ? '100vh' : 'auto',
                    display: 'block'
                  }}
                />

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualSearchGeneratorStandalone
