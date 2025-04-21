import React from "react";

interface TestModePanelProps {
  isTestMode: boolean;
  onToggleTestMode: () => void;
}

function TestModePanel({ isTestMode, onToggleTestMode }: TestModePanelProps) {
  return (
    <div className="max-w-4xl mx-auto mt-4 mb-4">
      <div className="flex justify-end mb-2">
        <button
          onClick={onToggleTestMode}
          className={`px-4 py-2 rounded font-medium transition ${
            isTestMode
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          {isTestMode ? "Exit Test Mode" : "Enter Test Mode"}
        </button>
      </div>

      {isTestMode && (
        <div
          className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-3 rounded"
          role="alert"
        >
          <div className="flex items-center">
            <svg
              className="h-5 w-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="font-bold">Test Mode Active</p>
          </div>
          <p className="text-sm mt-1">
            Using simulated ECG data to demonstrate UI functionality. No
            physical device required.
          </p>
        </div>
      )}
    </div>
  );
}

export default TestModePanel;
