// src/pages/transfers/transfers.tsx
import TransfersTable from "../../components/transferstable";
import "../../styles/table.css";

export default function TransfersPage() {
    return (
        <div className="transfers-grid">
            <div className="transfers-column">
                <TransfersTable
                    endpoint="/transfers-in/"
                    title="Transfers In"
                    transferField="transfers_in_event"
                />
            </div>

            <div className="transfers-column">
                <TransfersTable
                    endpoint="/transfers-out/"
                    title="Transfers Out"
                    transferField="transfers_out_event"
                />
            </div>
        </div>
    );
}