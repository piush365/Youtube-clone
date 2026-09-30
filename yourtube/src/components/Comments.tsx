import React, { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Languages, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import { errorMessage } from "@/lib/apiClient";
import {
  deleteComment,
  editComment,
  getComments,
  postComment,
  reactToComment,
  translateText,
} from "@/lib/commentService";
import { validateCommentText } from "@/lib/commentText";
import type { ReactionType } from "@/lib/commentReactions";
import { TRANSLATE_LANGUAGES, isTranslateLanguage, type TranslateLanguage } from "@/lib/languages";
import type { CommentDTO } from "@/lib/types";

const LANG_STORAGE_KEY = "yourtube:translate-lang";

function loadLang(): TranslateLanguage {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (isTranslateLanguage(v)) return v;
  } catch {
    // storage unavailable
  }
  return "en";
}

/** Returns true if the text is OK to send; otherwise shows a toast. */
function precheck(text: string): boolean {
  const result = validateCommentText(text);
  if (!result.ok) toast.error(result.message);
  return result.ok;
}

interface CommentItemProps {
  comment: CommentDTO;
  currentUid: string | null;
  lang: TranslateLanguage;
  onLangChange: (lang: TranslateLanguage) => void;
  onUpdated: (comment: CommentDTO) => void;
  onRemoved: (id: string) => void;
}

function CommentItem({ comment, currentUid, lang, onLangChange, onUpdated, onRemoved }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commentbody);
  const [saving, setSaving] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [translation, setTranslation] = useState<{ lang: TranslateLanguage; text: string } | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);

  const isOwner = currentUid === comment.userid;
  const liked = !!currentUid && comment.likes.includes(currentUid);
  const disliked = !!currentUid && comment.dislikes.includes(currentUid);

  const translate = async (target: TranslateLanguage) => {
    setTranslating(true);
    try {
      const text = await translateText(comment.commentbody, target);
      setTranslation({ lang: target, text });
      setShowTranslation(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTranslating(false);
    }
  };

  const pickLanguage = (value: string) => {
    if (!isTranslateLanguage(value)) return;
    onLangChange(value);
    translate(value);
  };

  const react = async (type: ReactionType) => {
    if (!currentUid) {
      toast.info("Sign in to like or dislike comments");
      return;
    }
    setReacting(true);
    try {
      const result = await reactToComment(comment.id, type);
      if (result.removed) {
        onRemoved(comment.id);
        toast.success("Comment removed after receiving 2 dislikes");
      } else {
        onUpdated({ ...comment, likes: result.likes, dislikes: result.dislikes });
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReacting(false);
    }
  };

  const save = async () => {
    if (!precheck(editText)) return;
    setSaving(true);
    try {
      onUpdated(await editComment(comment.id, editText));
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await deleteComment(comment.id);
      onRemoved(comment.id);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const langLabel = TRANSLATE_LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  return (
    <div className="flex gap-4" data-testid="comment">
      <Avatar className="w-10 h-10">
        {comment.userimage && <AvatarImage src={comment.userimage} />}
        <AvatarFallback>{comment.usercommented?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 mb-1 text-xs text-muted-foreground">
          <span className="font-medium text-sm text-foreground">{comment.usercommented}</span>
          {comment.city && <span>· {comment.city}</span>}
          <span>· {formatDistanceToNow(new Date(comment.commentedon))} ago</span>
          {comment.edited && <span>(edited)</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.commentbody);
                }}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={!editText.trim() || saving}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{comment.commentbody}</p>
            {translation && showTranslation && (
              <div className="mt-2 border-l-2 border-primary/40 pl-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Translated to {TRANSLATE_LANGUAGES.find((l) => l.code === translation.lang)?.label}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{translation.text}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                disabled={reacting || isOwner}
                onClick={() => react("like")}
                aria-pressed={liked}
                title={isOwner ? "You can't react to your own comment" : "Like"}
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current text-foreground" : ""}`} />
                {comment.likes.length > 0 && comment.likes.length}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={reacting || isOwner}
                onClick={() => react("dislike")}
                aria-pressed={disliked}
                title={isOwner ? "You can't react to your own comment" : "Dislike"}
              >
                <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-current text-foreground" : ""}`} />
                {comment.dislikes.length > 0 && comment.dislikes.length}
              </Button>

              <div className="flex items-center">
                {translation && showTranslation ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowTranslation(false)}>
                    Show original
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={translating}
                    onClick={() => translate(lang)}
                    title={`Translate to ${langLabel}`}
                  >
                    <Languages className="w-4 h-4" />
                    {translating ? "Translating…" : "Translate"}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-1.5" aria-label="Choose translation language">
                      <span className="max-w-24 truncate text-xs">{langLabel.split(" (")[0]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                    <DropdownMenuRadioGroup value={lang} onValueChange={pickLanguage}>
                      {TRANSLATE_LANGUAGES.map((l) => (
                        <DropdownMenuRadioItem key={l.code} value={l.code}>
                          {l.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {isOwner && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={remove}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CommentsProps {
  videoId: string;
}

const Comments = ({ videoId }: CommentsProps) => {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<TranslateLanguage>("en");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setLang(loadLang()), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getComments(videoId)
      .then((data) => !cancelled && setComments(data))
      .catch((err) => console.error("Failed to load comments:", err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const changeLang = useCallback((next: TranslateLanguage) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // storage unavailable
    }
  }, []);

  const handleSubmit = async () => {
    if (!user || !precheck(newComment)) return;
    setIsSubmitting(true);
    try {
      const created = await postComment(videoId, newComment);
      setComments((prev) => [created, ...prev]);
      setNewComment("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOne = useCallback(
    (updated: CommentDTO) => setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c))),
    []
  );
  const removeOne = useCallback((id: string) => setComments((prev) => prev.filter((c) => c.id !== id)), []);

  return (
    <section id="comments" className="space-y-6 scroll-mt-20" data-testid="comments">
      <h2 className="text-xl font-semibold">{loading ? "Comments" : `${comments.length} Comments`}</h2>

      {user ? (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              ref={inputRef}
              id="comment-input"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0 bg-transparent"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setNewComment("")} disabled={!newComment.trim()}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!newComment.trim() || isSubmitting}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="comment-signin-hint">
          Sign in to join the conversation.
        </p>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUid={user?.uid ?? null}
              lang={lang}
              onLangChange={changeLang}
              onUpdated={updateOne}
              onRemoved={removeOne}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default Comments;
