import { useMongoDB, RecordData } from "@/hooks/useMongoDB";

function UploadButton({ record }: { record: RecordData | null }) {
  const { uploadRecord, loading, error, success } = useMongoDB();

  const handleUpload = () => {
    if (record) {
      uploadRecord(record);
    }
  };

  const isDisabled =
    loading || !record || !record.user_id || record.ecg.length === 0;

  return (
    <div>
      <button
        onClick={handleUpload}
        disabled={isDisabled}
        className={`px-4 py-2 rounded ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {loading ? "Uploading..." : "Upload Record"}
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {success && <p className="text-green-600 mt-2">Upload successful!</p>}
    </div>
  );
}

export default UploadButton;
