import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Globe, Languages, MapPin, ThumbsDown, ThumbsUp } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import {
  getComments,
  postComment,
  editComment,
  deleteComment,
  likeComment,
  dislikeComment,
  hasSpecialCharacters,
} from "@/lib/commentService";
import { getUserLocation } from "@/lib/locationService";
import { translateText, LANGUAGES } from "@/lib/translateService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Comment {
  id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: any;
  city?: string;
  likedBy?: string[];
  dislikedBy?: string[];
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadComments = async () => {
    try {
      const data = await getComments(videoId);
      setComments(data as Comment[]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    if (hasSpecialCharacters(newComment)) {
      toast.error(
        "Comment blocked: special characters are not allowed in comments."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const location = await getUserLocation();
      const city = location?.city || "Unknown";
      const id = await postComment({
        videoid: videoId,
        userid: user.uid,
        commentbody: newComment,
        usercommented: user.name || "Anonymous",
        city,
      });
      const newCommentObj: Comment = {
        id,
        videoid: videoId,
        userid: user.uid,
        commentbody: newComment,
        usercommented: user.name || "Anonymous",
        commentedon: new Date().toISOString(),
        city,
        likedBy: [],
        dislikedBy: [],
      };
      setComments([newCommentObj, ...comments]);
      setNewComment("");
      toast.success("Comment posted");
    } catch (error: any) {
      if (error?.message === "SPECIAL_CHARACTERS") {
        toast.error("Comment blocked: special characters are not allowed.");
      } else {
        console.error("Error adding comment:", error);
        toast.error("Could not post comment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (comment: Comment) => {
    if (!user) {
      toast.error("Sign in to like comments");
      return;
    }
    try {
      const updated: any = await likeComment(comment.id, user.uid);
      if (updated) {
        setComments((prev) =>
          prev.map((c) => (c.id === comment.id ? { ...c, ...updated } : c))
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (comment: Comment) => {
    if (!user) {
      toast.error("Sign in to dislike comments");
      return;
    }
    if (comment.userid === user.uid) {
      toast.error("You cannot dislike your own comment");
      return;
    }
    try {
      const result: any = await dislikeComment(comment.id, user.uid);
      if (result.deleted) {
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
        toast.info("Comment removed automatically after 2 dislikes");
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, ...result.comment } : c
          )
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTranslate = async (comment: Comment, langCode: string) => {
    setTranslating(comment.id);
    try {
      const translated = await translateText(comment.commentbody, langCode);
      setTranslations((prev) => ({ ...prev, [comment.id]: translated }));
    } catch {
      toast.error("Translation failed, please try again");
    } finally {
      setTranslating(null);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;
    if (hasSpecialCharacters(editText)) {
      toast.error("Comment blocked: special characters are not allowed.");
      return;
    }
    try {
      await editComment(editingCommentId, editText);
      setComments((prev) =>
        prev.map((c) =>
          c.id === editingCommentId ? { ...c, commentbody: editText } : c
        )
      );
      setEditingCommentId(null);
      setEditText("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.log(error);
    }
  };

  const formatCommentDate = (commentedon: any) => {
    if (!commentedon) return "";
    const date = commentedon?.seconds
      ? new Date(commentedon.seconds * 1000)
      : new Date(commentedon);
    return formatDistanceToNow(date);
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div id="comments-section" className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment (any language, no special characters)..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            {newComment && hasSpecialCharacters(newComment) && (
              <p className="text-xs text-destructive">
                Special characters are not allowed — this comment will be
                blocked.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{comment.usercommented?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  {comment.city && (
                    <span className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-0.5" />
                      {comment.city}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatCommentDate(comment.commentedon)} ago
                  </span>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{comment.commentbody}</p>
                    {translations[comment.id] && (
                      <p className="text-sm mt-1 p-2 rounded bg-muted flex items-start gap-2">
                        <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <span>
                          {translations[comment.id]}
                          <button
                            className="ml-2 text-xs text-muted-foreground underline"
                            onClick={() =>
                              setTranslations((prev) => {
                                const next = { ...prev };
                                delete next[comment.id];
                                return next;
                              })
                            }
                          >
                            Show original
                          </button>
                        </span>
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleLike(comment)}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 mr-1 ${
                            user && comment.likedBy?.includes(user.uid)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {comment.likedBy?.length || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleDislike(comment)}
                      >
                        <ThumbsDown
                          className={`w-4 h-4 mr-1 ${
                            user && comment.dislikedBy?.includes(user.uid)
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {comment.dislikedBy?.length || 0}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            disabled={translating === comment.id}
                          >
                            <Languages className="w-4 h-4 mr-1" />
                            {translating === comment.id
                              ? "Translating..."
                              : "Translate"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-64 overflow-y-auto">
                          {LANGUAGES.map((lang) => (
                            <DropdownMenuItem
                              key={lang.code}
                              onClick={() => handleTranslate(comment, lang.code)}
                            >
                              {lang.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {comment.userid === user?.uid && (
                        <div className="flex gap-2 ml-2 text-sm text-muted-foreground">
                          <button onClick={() => handleEdit(comment)}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(comment.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
