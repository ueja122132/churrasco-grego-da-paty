import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"; // Assuming you have a UI library, adjust import as needed

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Faça login para continuar</DialogTitle>
                    <DialogDescription>
                        Você precisa estar autenticado para adicionar itens ao carrinho.
                    </DialogDescription>
                </DialogHeader>
                {/* Here you could place your existing LoginPage component or a simple login form */}
                <div className="flex justify-end space-x-2 mt-4">
                    <button
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <a href="/login" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
                        Ir para login
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
