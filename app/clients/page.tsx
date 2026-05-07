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
import { Plus } from "lucide-react"

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

    const [newClient, setNewClient] = useState<NewClient>({
        name: "",
        contact: "",
    })

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
                />
            </section>

            {/* CLIENT LIST */}
            <section className="w-[90%] mt-4 space-y-3 mb-24">
                {error ? <div className="text-xs text-red-600">{error}</div> : null}
                {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
                {!isLoading && clients.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No clients yet.</div>
                ) : null}
                {clients.map((client) => (
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

                        
                    </div>
                ))}
            </section>

        </main>
    )
}
