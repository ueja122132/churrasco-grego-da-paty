import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const StoreLanding: React.FC = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const handleRegister = () => {
        if (slug) {
            navigate(`/${slug}/register`);
        } else {
            navigate("/register");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary to-secondary text-white p-8">
            <h1 className="text-4xl font-bold mb-4">Bem-vindo ao nosso cardápio</h1>
            <p className="mb-6">Explore nosso delicioso menu abaixo.</p>
            {/* TODO: Render menu items fetched from API */}
            <button
                className="px-6 py-3 bg-white text-primary rounded-full hover:bg-gray-100 transition"
                onClick={handleRegister}
            >
                Registrar / Fazer Pedido
            </button>
        </div>
    );
};

export default StoreLanding;
