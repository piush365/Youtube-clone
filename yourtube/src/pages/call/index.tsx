import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Circle,
  Copy,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneOff,
  Square,
  Video,
  VideoOff,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ],
};

const CallPage = () => {
  const { user } = useUser();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordCleanupRef = useRef<(() => void) | null>(null);
  const unsubsRef = useRef<(() => void)[]>([]);

  const [callId, setCallId] = useState("");
  const [joinId, setJoinId] = useState("");
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    return () => {
      hangUp();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = localStream;
    cameraTrackRef.current = localStream.getVideoTracks()[0] || null;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
    };

    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    return pc;
  };

  const startCall = async () => {
    try {
      const pc = await setupPeerConnection();
      const callDoc = doc(collection(db, "calls"));
      const offerCandidates = collection(callDoc, "offerCandidates");
      const answerCandidates = collection(callDoc, "answerCandidates");

      setCallId(callDoc.id);
      setInCall(true);

      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(offerCandidates, e.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(callDoc, {
        offer: { sdp: offer.sdp, type: offer.type },
        createdBy: user?.uid || "anonymous",
        createdAt: new Date().toISOString(),
      });

      const unsubDoc = onSnapshot(callDoc, (snap) => {
        const data = snap.data();
        if (!pc.currentRemoteDescription && data?.answer) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });
      const unsubAns = onSnapshot(answerCandidates, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
      unsubsRef.current.push(unsubDoc, unsubAns);
      toast.success("Call created — share the call ID with your friend");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not start the call");
    }
  };

  const joinCall = async () => {
    const id = joinId.trim();
    if (!id) return;
    try {
      const callDoc = doc(db, "calls", id);
      const snap = await getDoc(callDoc);
      if (!snap.exists()) {
        toast.error("Call not found — check the ID");
        return;
      }

      const pc = await setupPeerConnection();
      const offerCandidates = collection(callDoc, "offerCandidates");
      const answerCandidates = collection(callDoc, "answerCandidates");

      setCallId(id);
      setInCall(true);

      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(answerCandidates, e.candidate.toJSON());
      };

      await pc.setRemoteDescription(
        new RTCSessionDescription(snap.data().offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callDoc, {
        answer: { sdp: answer.sdp, type: answer.type },
      });

      const unsubOff = onSnapshot(offerCandidates, (s) => {
        s.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
      unsubsRef.current.push(unsubOff);
      toast.success("Joined the call");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not join the call");
    }
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  // Share the screen (e.g. a YouTube tab) by swapping the outgoing video track.
  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;

    if (!sharing) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = display.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = display;
        setSharing(true);
        screenTrack.onended = async () => {
          if (cameraTrackRef.current) {
            await sender.replaceTrack(cameraTrackRef.current);
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
          setSharing(false);
        };
      } catch {
        // user cancelled the share dialog
      }
    } else {
      const currentTrack = sender.track;
      if (cameraTrackRef.current) {
        await sender.replaceTrack(cameraTrackRef.current);
      }
      currentTrack?.stop();
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setSharing(false);
    }
  };

  // Record the session: both videos composited on a canvas + mixed audio,
  // saved locally as a .webm file when stopped.
  const startRecording = () => {
    const localVideo = localVideoRef.current;
    const remoteVideo = remoteVideoRef.current;
    if (!localVideo) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;

    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(localVideo, 0, 0, 640, 480);
      if (remoteVideo && remoteVideo.readyState >= 2) {
        ctx.drawImage(remoteVideo, 640, 0, 640, 480);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(30);
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    if (localStreamRef.current?.getAudioTracks().length) {
      audioCtx
        .createMediaStreamSource(localStreamRef.current)
        .connect(dest);
    }
    if (remoteStreamRef.current?.getAudioTracks().length) {
      audioCtx
        .createMediaStreamSource(remoteStreamRef.current)
        .connect(dest);
    }
    dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yourtube-call-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Recording saved to your device");
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    recordCleanupRef.current = () => {
      cancelAnimationFrame(raf);
      audioCtx.close();
    };
    setRecording(true);
    toast.info("Recording started");
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recordCleanupRef.current?.();
    recorderRef.current = null;
    recordCleanupRef.current = null;
    setRecording(false);
  };

  const hangUp = async () => {
    if (recording) stopRecording();
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (callId) {
      try {
        await deleteDoc(doc(db, "calls", callId));
      } catch {
        // the other peer may have already cleaned up
      }
    }
    setInCall(false);
    setSharing(false);
    setCallId("");
    setMicOn(true);
    setCamOn(true);
  };

  const copyCallId = () => {
    navigator.clipboard.writeText(callId);
    toast.success("Call ID copied — send it to your friend");
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Video className="w-6 h-6" /> Video Call
      </h1>
      <p className="text-muted-foreground mb-6">
        Call a friend, share your screen (e.g. a YouTube tab) and record the
        session to your device.
      </p>

      {!inCall ? (
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div className="border rounded-xl p-6 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4" /> Start a new call
            </h2>
            <p className="text-sm text-muted-foreground">
              Creates a call ID you can share with a friend.
            </p>
            <Button className="w-full" onClick={startCall}>
              Start call
            </Button>
          </div>
          <div className="border rounded-xl p-6 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4" /> Join a call
            </h2>
            <Input
              placeholder="Paste call ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <Button
              className="w-full"
              variant="outline"
              onClick={joinCall}
              disabled={!joinId.trim()}
            >
              Join call
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Call ID:</span>
            <code className="bg-muted px-2 py-1 rounded">{callId}</code>
            <Button variant="ghost" size="sm" onClick={copyCallId}>
              <Copy className="w-4 h-4" />
            </Button>
            {recording && (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <Circle className="w-3 h-3 fill-red-500 animate-pulse" />
                Recording
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video bg-black rounded-lg object-cover"
              />
              <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                You {sharing && "(sharing screen)"}
              </span>
            </div>
            <div className="relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full aspect-video bg-black rounded-lg object-cover"
              />
              <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                Friend
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={micOn ? "secondary" : "destructive"} onClick={toggleMic}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button variant={camOn ? "secondary" : "destructive"} onClick={toggleCam}>
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button
              variant={sharing ? "default" : "secondary"}
              onClick={toggleScreenShare}
            >
              <MonitorUp className="w-4 h-4 mr-2" />
              {sharing ? "Stop sharing" : "Share screen"}
            </Button>
            <Button
              variant={recording ? "default" : "secondary"}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? (
                <>
                  <Square className="w-4 h-4 mr-2" /> Stop & save
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-2 text-red-500" /> Record
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={hangUp}>
              <PhoneOff className="w-4 h-4 mr-2" /> Hang up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallPage;
