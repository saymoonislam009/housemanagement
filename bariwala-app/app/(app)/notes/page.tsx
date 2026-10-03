import { getOrgContext, getNotes } from "@/lib/queries";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { NoteForm } from "@/components/NoteForm";
import { deleteNote } from "@/lib/actions/notes";
import { shortDate } from "@/lib/format";
import { Icon, paths } from "@/components/icons";

export default async function NotesPage() {
  const { org } = await getOrgContext();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const notes = await getNotes(org.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Notes"
        sub="Jot down anything worth remembering, tied to a date"
        action={
          <Modal title="Add note" trigger={<Button variant="primary">+ Add note</Button>}>
            <NoteForm defaultDate={today} />
          </Modal>
        }
      />

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet. Jot down reminders, tenant calls, or reasons for a discount — whatever's worth remembering."
        />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brass-600">{shortDate(n.noteDate, dLocale)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{n.content}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Modal
                    title="Edit note"
                    trigger={
                      <button className="rounded-lg p-1.5 text-ink-600/50 hover:bg-ink-900/5">
                        <Icon path={paths.edit} className="h-4 w-4" />
                      </button>
                    }
                  >
                    <NoteForm noteId={n.id} defaultDate={n.noteDate} defaultContent={n.content} />
                  </Modal>
                  <ConfirmDeleteButton action={deleteNote.bind(null, n.id)} confirmText="Delete this note?" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
