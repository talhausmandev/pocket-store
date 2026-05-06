"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface Client {
    name: string
    contact: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([
        {
            name: "Tech Solutions Pvt. Ltd.",
            contact: "contact@techsolutions.com",
        },
        {
            name: "Creative Studio",
            contact: "+91 91234 56789",
        },
    ])

    const [newClient, setNewClient] = useState<Client>({
        name: "",
        contact: "",
    })

    const addClient = () => {
        if (!newClient.name) return

        setClients((prev) => [...prev, newClient])
        setNewClient({ name: "", contact: "" })
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
                    </DialogHeader>

                    <div className="space-y-3">
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
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            onClick={addClient}
                        >
                            Save Client
                        </Button>
                    </div>
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
                {clients.map((client, index) => (
                    <div
                        key={index}
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
                                    {client.contact}
                                </p>
                            </div>
                        </div>

                        
                    </div>
                ))}
            </section>

        </main>
    )
}