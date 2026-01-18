export default function LoadingOverlay({ active }: { active: boolean }) {
    return (
        <div
            style={{
                display: active ? "flex" : "none",
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div className="loader">
                <div></div> {/* inner 4th ring */}
            </div>

        </div>
    );
}
