#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EKSİK PARÇA (The Missing Piece) — Otomatik Vaka Doğrulama Betiği (Case Validator)
VakaSartnamesi.txt Bölüm 6'da belirtilen 4 matematiksel DAG ve Asimetri testini +
kelime sınırı kurallarını (<= 55 kelime) doğrular.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Set

def validate_case(file_path: Path) -> List[str]:
    errors: List[str] = []
    with open(file_path, "r", encoding="utf-8") as f:
        data: Dict[str, Any] = json.load(f)

    case_id = data.get("case_id", file_path.stem)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    solution = data.get("solution", {})
    meta = data.get("meta", {})

    node_map: Dict[str, Dict[str, Any]] = {n["node_id"]: n for n in nodes}
    unlocked_map: Dict[str, Dict[str, Any]] = {}
    edge_by_unlocked: Dict[str, Dict[str, Any]] = {}

    for edge in edges:
        un = edge.get("unlocked_node", {})
        if un and "node_id" in un:
            unlocked_map[un["node_id"]] = un
            edge_by_unlocked[un["node_id"]] = edge

    # 1. Çözülebilirlik Testi (Reachability Check)
    required_nodes: List[str] = solution.get("required_nodes", [])
    if len(required_nodes) != 3:
        errors.append(f"[{case_id}] Çözüm Üçgeni Kuralı İhlali: solution.required_nodes tam olarak 3 düğüm içermelidir (Mevcut: {len(required_nodes)}).")

    reachable_layer1: Set[str] = set(node_map.keys())
    reachable_all: Set[str] = set(reachable_layer1)

    changed = True
    while changed:
        changed = False
        for edge in edges:
            src = edge.get("source_node")
            tgt = edge.get("target_node")
            un_id = edge.get("unlocked_node", {}).get("node_id")
            if src in reachable_all and tgt in reachable_all and un_id and un_id not in reachable_all:
                reachable_all.add(un_id)
                changed = True

    for req_id in required_nodes:
        if req_id not in reachable_all:
            errors.append(f"[{case_id}] Çözülebilirlik Hatası: '{req_id}' düğümüne başlangıç kanıtlarından ulaşılamıyor.")

    # 2. Asimetri Dengesi Testi (Asymmetry Balance Check)
    group_1 = [n for n in nodes if n.get("partition_group") == 1]
    group_2 = [n for n in nodes if n.get("partition_group") == 2]
    if len(group_1) != len(group_2):
        errors.append(
            f"[{case_id}] Asimetri Dengesi Hatası: partition_group 1 ({len(group_1)}) ve partition_group 2 ({len(group_2)}) eşit sayıda düğüm içermiyor."
        )

    for edge in edges:
        src_node = node_map.get(edge.get("source_node"))
        tgt_node = node_map.get(edge.get("target_node"))
        if src_node and tgt_node:
            if src_node.get("partition_group") == tgt_node.get("partition_group"):
                errors.append(
                    f"[{case_id}] Çapraz Körlük / Asimetri Hatası: '{edge.get('edge_id')}' bağlantısı aynı kümedeki ({src_node.get('partition_group')}) iki düğüm arasında kurulmuş!"
                )

    # 3. Yetim Düğüm Kontrolü (Orphan Check)
    connected_nodes: Set[str] = set()
    for edge in edges:
        connected_nodes.add(edge.get("source_node"))
        connected_nodes.add(edge.get("target_node"))
    for req_id in required_nodes:
        connected_nodes.add(req_id)

    for n in nodes:
        nid = n["node_id"]
        is_rh = n.get("is_red_herring", False)
        if not is_rh and nid not in connected_nodes:
            errors.append(f"[{case_id}] Yetim Düğüm Hatası: '{nid}' yanıltıcı ipucu (Red Herring) olmadığı halde hiçbir bağlantıda veya çözümde kullanılmamış.")

    # 4. Solo Bütçe Kontrolü (Solo Budget Check)
    needed_base_nodes: Set[str] = set()
    def collect_base_nodes(target_id: str):
        if target_id in node_map:
            needed_base_nodes.add(target_id)
        elif target_id in edge_by_unlocked:
            e = edge_by_unlocked[target_id]
            collect_base_nodes(e["source_node"])
            collect_base_nodes(e["target_node"])

    for req_id in required_nodes:
        collect_base_nodes(req_id)

    min_solo_cost = sum(node_map[nid].get("solo_cost", 1) for nid in needed_base_nodes if nid in node_map)
    solo_token_limit = meta.get("solo_token_limit", 0)
    if min_solo_cost > solo_token_limit:
        errors.append(
            f"[{case_id}] Solo Bütçe Hatası: Çözüm için gereken asgari solo_cost ({min_solo_cost}) > solo_token_limit ({solo_token_limit})."
        )

    # 5. Kelime Sınırı Kontrolü (Word Count <= 55 words)
    for n in nodes:
        words = n.get("content", "").split()
        if len(words) > 55:
            errors.append(
                f"[{case_id}] Okuma Yükü Hatası: '{n['node_id']}' metni {len(words)} kelime (Maksimum: 55)."
            )

    return errors

def main():
    cases_dir = Path(__file__).resolve().parent.parent / "cases"
    case_files = sorted(cases_dir.glob("*.json"))
    if not case_files:
        print("HATA: Hiç vaka JSON dosyası bulunamadı!")
        sys.exit(1)

    all_passed = True
    print("=" * 68)
    print("EKSİK PARÇA — OTOMATİK VAKA DOĞRULAMA RAPORU (DAG & ASİMETRİ TESTİ)")
    print("=" * 68)
    for cf in case_files:
        errs = validate_case(cf)
        if errs:
            all_passed = False
            print(f"[BAŞARISIZ] {cf.name}:")
            for e in errs:
                print(f"   - {e}")
        else:
            with open(cf, "r", encoding="utf-8") as f:
                d = json.load(f)
            print(
                f"[GEÇTİ] {cf.name:15s} | {d['meta']['title']:34s} | "
                f"Düğüm: {len(d['nodes'])} | Bağ: {len(d['edges'])} | Solo Bütçe: OK"
            )
    print("=" * 68)
    if not all_passed:
        sys.exit(1)
    print("TÜM VAKALAR 4 MATEMATİKSEL DOĞRULAMA TESTİNİ BAŞARIYLA GEÇTİ.")

if __name__ == "__main__":
    main()
