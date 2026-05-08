"use client"

import { useEffect, useState, type SubmitEvent } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Edit2, Plus } from "lucide-react"

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

    return (
        <main className="w-full text-xs">

            {/* HEADER + DIALOG */}
            <Dialog>
                <div className="w-[90%] flex justify-between my-2">
                    <div className="text-xl font-bold mx-10">
                        Clients
                    </div>

                    <DialogTrigger asChild>
                        <button className="h-6 w-6 flex items-center justify-center rounded-full bg-orange-500 text-white shadow">
                            <Plus className="h-4 w-4" />
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

            {/* SEARCH */}
            <section className="w-[90%]">
                <Input
                    placeholder="Search clients..."
                    className="h-9 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </section>

            {/* CLIENT LIST */}
            <section className="w-[90%] mt-4 space-y-3 mb-24">
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
                        className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                    >
                        {/* LEFT */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
                                {client.name.charAt(0)}
                            </div>

                            <div className="min-w-0">
                                <p className="font-medium truncate">
                                    {client.name}
                                </p>
                                <p className="text-muted-foreground truncate text-[10px]">
                                    {client.contact || "-"}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditClient(client)}
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </section>

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

        </main>
    )
}
