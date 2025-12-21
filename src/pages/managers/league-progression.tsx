import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import * as d3 from "d3";

// --- Types ---
type StandRow = { player_name: string; total: number };
type Frame = { gameweek: number; standings: StandRow[] };
type ProgressionPayload = { league_name: string; frames: Frame[] };
type KeyframeData = { name: string; value: number; rank: number };
type Keyframe = { gw: number; data: KeyframeData[] };

// --- Constants ---
const TOP_N = 15;
const STEPS_PER_GW = 15;
const DURATION = 70;
const BAR_HEIGHT = 36;
const MARGIN = { top: 50, right: 100, bottom: 50, left: 180 };

export default function LeagueProgressionPage() {
    const navigate = useNavigate();
    const params = useParams<{ league_id?: string }>();
    const [sp] = useSearchParams();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const leagueIdStr = params.league_id ?? sp.get("league_id") ?? "";
    const leagueId = Number(leagueIdStr);
    const hasLeague = Number.isFinite(leagueId) && leagueId > 0;

    const { data, isLoading } = useQuery({
        queryKey: ["league-progression", leagueId],
        queryFn: async (): Promise<ProgressionPayload> => {
            const r = await api.get(`/v1/league-progression/${leagueId}/`);
            return r.data;
        },
        enabled: hasLeague,
    });

    const prepared = useMemo(() => {
        if (!data?.frames?.length) return null;
        const frames = [...data.frames].sort((a, b) => a.gameweek - b.gameweek);
        const playerNames = Array.from(new Set(frames.flatMap(f => f.standings.map(s => s.player_name))));

        const getRankedData = (getValue: (name: string) => number): KeyframeData[] => {
            return playerNames
                .map(name => ({ name, value: getValue(name) }))
                .sort((a, b) => d3.descending(a.value, b.value))
                .map((d, i) => ({ ...d, rank: i }));
        };

        const keyframes: Keyframe[] = [];
        for (let i = 0; i < frames.length - 1; i++) {
            const current = frames[i];
            const next = frames[i + 1];
            const currentMap = new Map(current.standings.map(s => [s.player_name, s.total]));
            const nextMap = new Map(next.standings.map(s => [s.player_name, s.total]));

            for (let t = 0; t < STEPS_PER_GW; t++) {
                const p = t / STEPS_PER_GW;
                keyframes.push({
                    gw: current.gameweek * (1 - p) + next.gameweek * p,
                    data: getRankedData(name => (currentMap.get(name) ?? 0) * (1 - p) + (nextMap.get(name) ?? 0) * p)
                });
            }
        }
        keyframes.push({
            gw: frames[frames.length - 1].gameweek,
            data: getRankedData(name => new Map(frames[frames.length - 1].standings.map(s => [s.player_name, s.total])).get(name) ?? 0)
        });

        return {
            keyframes,
            colorScale: d3.scaleOrdinal(d3.schemeTableau10).domain(playerNames),
            leagueName: data.league_name
        };
    }, [data]);

    useEffect(() => {
        if (!prepared || !containerRef.current) return;

        let stop = false;
        const container = containerRef.current;
        container.innerHTML = "";

        const width = Math.max(800, container.clientWidth);
        const height = MARGIN.top + MARGIN.bottom + (BAR_HEIGHT * TOP_N);
        const chartWidth = width - MARGIN.left - MARGIN.right;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("overflow", "visible");

        const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
        const axisG = g.append("g");
        const barG = g.append("g");

        // --- Gameweek Label (Watermark style) ---
        const gwLabel = svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width - 20)
            .attr("y", height - 20)
            .attr("font-size", "70px")
            .attr("font-weight", "900")
            .attr("fill", "#000")
            .attr("opacity", 0.08);

        const x = d3.scaleLinear().range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, TOP_N]).range([0, TOP_N * BAR_HEIGHT]);

        // Helper for rounded right-only corners
        const roundedRightRect = (x: number, y: number, w: number, h: number, r: number) => {
            const radius = Math.min(r, w / 2, h / 2);
            return `M${x},${y} 
                    h${w - radius} 
                    a${radius},${radius} 0 0 1 ${radius},${radius} 
                    v${h - 2 * radius} 
                    a${radius},${radius} 0 0 1 -${radius},${radius} 
                    h${-(w - radius)} 
                    z`;
        };

        async function run() {
            for (const kf of prepared!.keyframes) {
                if (stop) break;

                const max = d3.max(kf.data, d => d.value) || 1;
                x.domain([0, max]);

                // Update Gameweek Text
                gwLabel.text(`GW ${Math.floor(kf.gw)}`);

                axisG.transition().duration(DURATION).ease(d3.easeLinear)
                    .call(d3.axisTop(x).ticks(width / 150).tickSize(-TOP_N * BAR_HEIGHT))
                    .call(g => g.select(".domain").remove());

                const bars = barG.selectAll<SVGGElement, KeyframeData>("g.bar-row")
                    .data(kf.data.filter(d => d.rank < TOP_N), d => d.name);

                const enter = bars.enter().append("g")
                    .attr("class", "bar-row")
                    .attr("transform", d => `translate(0, ${y(TOP_N)})`);

                enter.append("path")
                    .attr("class", "bar-path")
                    .attr("fill", d => prepared!.colorScale(d.name) as string);

                enter.append("text")
                    .attr("class", "name-label")
                    .attr("x", -10)
                    .attr("y", (BAR_HEIGHT - 8) / 2)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "middle")
                    .attr("font-weight", "bold")
                    .text(d => d.name);

                enter.append("text")
                    .attr("class", "val-label")
                    .attr("y", (BAR_HEIGHT - 8) / 2)
                    .attr("dominant-baseline", "middle")
                    .attr("font-weight", "bold");

                const update = bars.merge(enter as any);

                update.transition().duration(DURATION).ease(d3.easeLinear)
                    .attr("transform", d => `translate(0, ${y(d.rank)})`);

                update.select("path.bar-path").transition().duration(DURATION).ease(d3.easeLinear)
                    .attr("d", d => roundedRightRect(0, 0, x(d.value), BAR_HEIGHT - 8, 8));

                update.select("text.val-label").transition().duration(DURATION).ease(d3.easeLinear)
                    .attr("x", d => x(d.value) + 10)
                    .text(d => Math.round(d.value));

                bars.exit().remove();
                await d3.transition().duration(DURATION).end();
            }
        }

        run();
        return () => { stop = true; };
    }, [prepared]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h1 className="page-title">{prepared?.leagueName}</h1>
            </div>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    background: "#fff",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    minHeight: "650px"
                }}
            />
        </div>
    );
}