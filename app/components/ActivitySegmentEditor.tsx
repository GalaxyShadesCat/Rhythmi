import React, { useState } from "react";
import { ActivityType, ActivitySegment } from "@/hooks/useMongoDB";
import { ACTIVITY_COLORS } from "@/hooks/useMongoDB";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

export function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type as ActivityType] || "gray";
}

interface ActivitySegmentEditorProps {
  ecgData: ECGDataPoint[];
  segments: ActivitySegment[];
  setSegments: React.Dispatch<React.SetStateAction<ActivitySegment[]>>;
}

function ActivitySegmentEditor({
  ecgData,
  segments,
  setSegments,
}: ActivitySegmentEditorProps) {
  const [activityType, setActivityType] = useState<ActivityType>("rest");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // ECG metadata
  const ecgStart = ecgData.length > 0 ? ecgData[0].timestamp : null;
  const ecgEnd =
    ecgData.length > 0 ? ecgData[ecgData.length - 1].timestamp : null;

  function timeStringToTimestamp(baseDate: number, time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  }

  function timestampToTimeString(timestamp: number): string {
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return timeString.replace(/am|pm/, (m) => m.toUpperCase());
  }

  function timestampToInputTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  function hasOverlap(
    newStart: number,
    newEnd: number,
    segments: ActivitySegment[],
    excludeIndex: number | null = null
  ): boolean {
    return segments.some((seg, index) => {
      if (excludeIndex !== null && index === excludeIndex) return false;
      return newStart < seg.end && newEnd > seg.start;
    });
  }

  function isValidSegmentDuration(start: number, end: number): boolean {
    const MIN_SEGMENT_DURATION = 5 * 1000; // 5 seconds in milliseconds
    return end - start >= MIN_SEGMENT_DURATION;
  }

  const isAddDisabled = () => {
    if (!startTime || !endTime || !ecgStart || !ecgEnd) return true;

    const startTs = timeStringToTimestamp(ecgStart, startTime);
    const endTs = timeStringToTimestamp(ecgStart, endTime);

    if (startTs >= endTs) return true;
    // if (startTs < ecgStart || endTs > ecgEnd) return true;
    if (hasOverlap(startTs, endTs, segments, editIndex)) return true;

    return false;
  };

  const handleAddOrUpdateSegment = () => {
    if (!ecgStart || !ecgEnd) {
      alert("ECG data is missing.");
      return;
    }

    let startTs = timeStringToTimestamp(ecgStart, startTime);
    let endTs = timeStringToTimestamp(ecgStart, endTime);

    if (startTs >= endTs) {
      alert("Start time must be before end time.");
      return;
    }

    if (startTs < ecgStart) {
      console.log("Start time is before ECG start. Clamping to ECG start.");
      startTs = ecgStart;
    }

    if (endTs > ecgEnd) {
      console.log("End time is after ECG end. Clamping to ECG end.");
      endTs = ecgEnd;
    }

    if (startTs >= endTs) {
      alert("Adjusted time range is invalid (start >= end).");
      return;
    }

    if (hasOverlap(startTs, endTs, segments, editIndex)) {
      alert("This segment overlaps with an existing one.");
      return;
    }

    if (!isValidSegmentDuration(startTs, endTs)) {
      alert("This segment is less than 5 seconds long.");
      return;
    }

    const newSegment: ActivitySegment = {
      type: activityType,
      start: startTs,
      end: endTs,
    };

    if (editIndex !== null) {
      const updated = [...segments];
      updated[editIndex] = newSegment;
      setSegments(updated);
      setEditIndex(null);
    } else {
      setSegments([...segments, newSegment]);
    }

    setActivityType("rest");
    setStartTime("");
    setEndTime("");
  };

  const handleEdit = (index: number) => {
    const seg = segments[index];
    setActivityType(seg.type);
    setStartTime(timestampToInputTime(seg.start));
    setEndTime(timestampToInputTime(seg.end));
    setEditIndex(index);
  };

  const handleDelete = (index: number) => {
    const updated = segments.filter((_, i) => i !== index);
    setSegments(updated);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4">Activity Annotation</h2>

      <div className="mb-4 text-sm text-gray-700">
        {ecgStart && ecgEnd ? (
          <p>
            ECG Time Range:{" "}
            <span className="font-medium text-blue-700">
              {timestampToTimeString(ecgStart)} to{" "}
              {timestampToTimeString(ecgEnd)}
            </span>
          </p>
        ) : (
          <p className="text-red-600">No ECG data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <select
          className="p-2 border rounded"
          value={activityType}
          onChange={(e) => setActivityType(e.target.value as ActivityType)}
        >
          <option value="rest">Rest</option>
          <option value="walk">Walk</option>
          <option value="run">Run</option>
        </select>
        <input
          type="time"
          className="p-2 border rounded"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          className="p-2 border rounded"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <button
          className={`px-4 py-2 rounded text-white ${
            isAddDisabled()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          onClick={handleAddOrUpdateSegment}
          disabled={isAddDisabled()}
        >
          {editIndex !== null ? "Update" : "Add"}
        </button>
      </div>

      {segments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border rounded">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Start</th>
                <th className="p-2 border">End</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, index) => (
                <tr key={index} className="border-t">
                  <td className="p-2 border">
                    <span
                      className={`inline-block w-3 h-3 rounded-full mr-2 bg-${getActivityColor(
                        seg.type
                      )}-500`}
                    ></span>
                    {seg.type}
                  </td>
                  <td className="p-2 border">
                    {timestampToTimeString(seg.start)}
                  </td>
                  <td className="p-2 border">
                    {timestampToTimeString(seg.end)}
                  </td>
                  <td className="p-2 border space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleEdit(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(index)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ActivitySegmentEditor;
