"use client"

import { useEffect, useState, type SubmitEvent } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Edit2, Plus, Trash2 } from "lucide-react"

interface Client {
    id: string
    name: string
    contact?: string
}

type NewClient = {
    name: string
    contact: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")

    const [newClient, setNewClient] = useState<NewClient>({
        name: "",
        contact: "",
    })

    const [editOpen, setEditOpen] = useState(false)
    const [editClientId, setEditClientId] = useState("")
    const [editName, setEditName] = useState("")
    const [editContact, setEditContact] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)

    const loadClients = async () => {
        setError(null)
        setIsLoading(true)
        try {
            const res = await fetch("/api/client", { cache: "no-store" })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to load clients")
                setClients([])
                return
            }
            setClients(Array.isArray(data?.clients) ? data.clients : [])
        } catch {
            setError("Failed to load clients")
            setClients([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(() => {
            void loadClients()
        }, 0)

        return () => clearTimeout(t)
    }, [])

    const addClient = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const trimmedName = newClient.name.trim()
        if (!trimmedName) return

        try {
            const res = await fetch("/api/client", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmedName,
                    contact: (newClient.contact ?? "").trim(),
                }),
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to create client")
                return
            }

            if (data?.client) {
                setClients((prev) => [data.client, ...prev])
            } else {
                void loadClients()
            }

            setNewClient({ name: "", contact: "" })
        } catch {
            setError("Failed to create client")
        }
    }

    const getFilteredClients = (list: Client[], q: string) => {
        const query = q.trim().toLowerCase()
        if (!query) return list
        return list.filter((c) => {
            const name = (c.name ?? "").toLowerCase()
            const contact = (c.contact ?? "").toLowerCase()
            return name.includes(query) || contact.includes(query)
        })
    }

    const filteredClients = getFilteredClients(clients, search)

    const openEditClient = (client: Client) => {
        setError(null)
        setEditClientId(client.id)
        setEditName(client.name ?? "")
        setEditContact(client.contact ?? "")
        setEditOpen(true)
    }

    const saveClientEdit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const id = editClientId
        const name = editName.trim()
        const contact = editContact.trim()

        if (!id) return
        if (!name) {
            setError("Client name is required")
            return
        }

        setIsEditing(true)
        try {
            const res = await fetch("/api/client", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name, contact }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to update client")
                return
            }

            const updated: Client | null = data?.client ?? null
            if (updated) {
                setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
            } else {
                void loadClients()
            }

            setEditOpen(false)
        } catch {
            setError("Failed to update client")
        } finally {
            setIsEditing(false)
        }
    }

    const requestDeleteClient = (client: Client) => {
        setError(null)
        if (!client?.id) return
        setDeleteTarget(client)
        setDeleteOpen(true)
    }

    const deleteClient = async () => {
        setError(null)
        if (!deleteTarget?.id) return
        const clientId = deleteTarget.id

        setDeletingId(clientId)
        try {
            const res = await fetch("/api/client", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: clientId }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to delete client")
                return
            }
            setClients((prev) => prev.filter((c) => c.id !== clientId))
            setDeleteOpen(false)
            setDeleteTarget(null)
        } catch {
            setError("Failed to delete client")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <main className="w-full text-xs">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
                <Dialog>
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-lg sm:text-xl font-bold leading-tight">Clients</div>

                        <DialogTrigger asChild>
                            <button className="h-9 w-9 flex items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition shrink-0">
                                <Plus className="h-5 w-5" />
                            </button>
                        </DialogTrigger>
                    </div>

                    <DialogContent className="text-xs">
                        <DialogHeader>
                            <DialogTitle>Add Client</DialogTitle>
                            <DialogDescription>
                                Add a new client by entering their name and contact details.
                            </DialogDescription>
                        </DialogHeader>

                        <form className="space-y-3" onSubmit={addClient}>
                            <Input
                                placeholder="Client Name"
                                value={newClient.name}
                                onChange={(e) =>
                                    setNewClient({ ...newClient, name: e.target.value })
                                }
                            />

                            <Input
                                placeholder="Contact"
                                value={newClient.contact}
                                onChange={(e) =>
                                    setNewClient({ ...newClient, contact: e.target.value })
                                }
                            />

                            <Button
                                type="submit"
                                className="w-full bg-orange-500 hover:bg-orange-600"
                            >
                                Save Client
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>

                <section className="mt-3">
                    <Input
                        placeholder="Search clients..."
                        className="h-9 text-xs"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </section>

                <section className="mt-4 space-y-2 sm:space-y-3 mb-24">
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
                    {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
                    {!isLoading && filteredClients.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                            {clients.length === 0 ? "No clients yet." : "No matching clients."}
                        </div>
                    ) : null}
                    {filteredClients.map((client) => (
                        <div
                            key={client.id}
                            className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold shrink-0">
                                    {client.name.charAt(0)}
                                </div>

                                <div className="min-w-0">
                                    <p className="font-medium truncate">{client.name}</p>
                                    <p className="text-muted-foreground truncate text-[10px]">
                                        {client.contact || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditClient(client)}
                                    disabled={deletingId === client.id}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => requestDeleteClient(client)}
                                    disabled={deletingId === client.id}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </section>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                        <DialogDescription>
                            Update client name and contact details.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-3" onSubmit={saveClientEdit}>
                        <Input
                            placeholder="Client Name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                        <Input
                            placeholder="Contact"
                            value={editContact}
                            onChange={(e) => setEditContact(e.target.value)}
                        />
                        <Button
                            type="submit"
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            disabled={isEditing}
                        >
                            {isEditing ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open)
                    if (!open) setDeleteTarget(null)
                }}
            >
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Delete Client</DialogTitle>
                        <DialogDescription>
                            This will permanently delete {deleteTarget?.name ? `"${deleteTarget.name}"` : "this client"}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteOpen(false)
                                setDeleteTarget(null)
                            }}
                            disabled={!!deletingId}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => void deleteClient()}
                            disabled={!!deletingId}
                        >
                            {deletingId ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </main>
    )
}
