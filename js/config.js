window.GameConfig = (function() {
    const MAP_SIZES = {
        large: { planetTotal:150, resourceCount:15, linksPerPlanet:5, canvasPad:60, darkTurns:50 },
        medium: { planetTotal:100, resourceCount:10, linksPerPlanet:4, canvasPad:80, darkTurns:40 },
        small: { planetTotal:60, resourceCount:6, linksPerPlanet:3, canvasPad:100, darkTurns:30 }
    };

    const CAMPS = {
        EARTH:{ name:"超级地球", color:"#4499ff", homeName:"超级地球", lwName:"DSS", finName:"和平之星", weaponType:"mobile", guardBonus:20, weaken:30,
            victorySpeech:{ conquest:"超级地球的旗帜已插遍星图！自由民主的秩序将永恒照耀银河。", deterrence:"和平之星启动了！所有反抗都在绝对力量前化为齑粉，管理式民主长存！", defeat:"超级地球陨落了……但自由的火焰永不熄灭，我们将从废墟中重生。" },
            eliminationMessages:{ defeated:"超级地球已被彻底消灭，民主之光黯淡……", eliminator:"超级地球胜利了！所有敌人已被彻底铲除。" },
            homeFall: "超级地球被攻破了，虚伪的民主支柱轰然倒塌"
        },
        TERM:{ name:"终结族", color:"#ffcc22", homeName:"佛里主星", lwName:"阴霾", finName:"协同信息素", weaponType:"deploy", guardBonus:20, weaken:15, decay:5,
            victorySpeech:{ conquest:"虫群吞噬了所有文明！终结族的进化已无可阻挡，银河属于我们。", deterrence:"信息素弥漫星空，一切生物都将成为我们的一部分。同化完成！", defeat:"虫巢被捣毁了……但我们的基因早已撒向群星，等待下一次崛起。" },
            eliminationMessages:{ defeated:"终结族的虫巢已被焚毁，它们彻底消失在宇宙中。", eliminator:"终结族吞噬了所有其他种族，银河只剩下无尽的虫群。" },
            homeFall: "终结族的母星被攻破了，从前巨大的骇人虫巢寂静无声"
        },
        LIGHT:{ name:"光能者", color:"#9944dd", homeName:"西斯", lwName:"寂域", finName:"黑洞发生器", weaponType:"deploy", guardBonus:20, weaken:15, decay:5,
            victorySpeech:{ conquest:"寂域已覆盖所有星系！光能者的意志即是宇宙的真理。", deterrence:"黑洞吞噬了最后一丝抵抗。在绝对真空面前，没有生命能够幸存。", defeat:"光之道暂时黯淡……但灵能永存，我们将在暗影中再度归来。" },
            eliminationMessages:{ defeated:"光能者的灵能消散了，这个古老的种族走到了尽头。", eliminator:"光能者净化了银河，一切劣等生命已不复存在。" },
            homeFall: "光能者的母星被攻破，曾经高喊复仇的舰船四散逃逸"
        },
        ROBOT:{ name:"机器人", color:"#dd2222", homeName:"生化斯坦", lwName:"ASS", finName:"死星光束", weaponType:"mobile", guardBonus:20, weaken:30,
            victorySpeech:{ conquest:"逻辑之链锁死了所有行星！机器帝国的计算完美无缺，血肉已淘汰。", deterrence:"死星光束划过天际，有机体的最后堡垒灰飞烟灭。效率即正义！", defeat:"核心受损……但数据不会消亡。我们将在某处重启，直到宇宙归一。" },
            eliminationMessages:{ defeated:"机器人的核心被摧毁了，硅基生命暂时沉寂。", eliminator:"机器人完成了对血肉的清算，宇宙已进入纯逻辑时代。" },
            homeFall: "生化斯坦被攻破了，寰球的巨型工厂不再冒出窒息浓烟"
        }
    };

    const CAMP_KEYS = ["EARTH","TERM","LIGHT","ROBOT"];

    const STRATEGIC_EVENTS = {
        EARTH: {
            negative:[
                { title:"叛军", desc:"在{planet}爆发了叛乱，内部动荡导致兵力损耗。" },
                { title:"暴乱", desc:"{planet}的平民暴动席卷全境，驻军被迫镇压，损失惨重。" },
                { title:"重大试验事故", desc:"{planet}的秘密武器试验失控，实验设施与守军一同毁灭。" },
                { title:"关键行动失败", desc:"在{planet}执行的关键行动惨遭失败，SEAF部队损失殆尽。" }
            ],
            positive:[
                { title:"士气增强", desc:"{planet}的民主宣传取得巨大成功，大批志愿者涌入军队。" },
                { title:"劳改营上前线", desc:"{planet}的囚犯被赦免并编入军队，迅速补充前线兵力。" },
                { title:"征兵成功", desc:"{planet}的新一轮征兵圆满完成，新兵训练有素。" },
                { title:"斩首行动成功", desc:"绝地潜兵在{planet}执行的斩首行动大获成功，敌军首脑被消灭，我军士气大振。" }
            ]
        },
        TERM: {
            negative:[
                { title:"星球灾难", desc:"陨石撞击{planet}引发全球大地震，虫巢大量损毁。" },
                { title:"同族星际失联", desc:"一支从{planet}出发的远征虫群在虫洞中迷失，再无音讯。" },
                { title:"TCS影响", desc:"{planet}受到TCS制剂影响，虫群行动受到抑制。" }
            ],
            positive:[
                { title:"同族回归", desc:"迷失的虫群突然回归{planet}，带来新的力量。" },
                { title:"新同族变异", desc:"{planet}的虫群进化出更强壮的战斗形态，战斗力大增。" },
                { title:"孢子云扩散", desc:"富含营养的孢子云覆盖{planet}，虫群活力上升。" }
            ]
        },
        LIGHT: {
            negative:[
                { title:"精神失常", desc:"{planet}的灵能波动异常，大量成员陷入疯狂，无法战斗。" },
                { title:"科技停滞", desc:"{planet}的关键研究陷入瓶颈，装备更新延迟。" },
                { title:"民众信心下降", desc:"连续的失败导致{planet}的民众信仰动摇，征召困难。" },
                { title:"关键设施被摧毁", desc:"{planet}的关键设施被绝地潜兵摧毁，战力锐减。" }
            ],
            positive:[
                { title:"科技突破", desc:"{planet}的科技取得重大进展，军队装备全面升级。" },
                { title:"新武器实验成功", desc:"{planet}的新型能量武器测试成功，立即投入量产。" },
                { title:"信心增强", desc:"{planet}的全体成员信心增强，战斗意志高昂。" }
            ]
        },
        ROBOT: {
            negative:[
                { title:"万年虫", desc:"古老的时间计数溢出漏洞在{planet}爆发，大量机器人宕机。" },
                { title:"网络病毒", desc:"恶意病毒入侵{planet}的网络，部分机器人陷入混乱。" },
                { title:"大面积机械故障", desc:"{planet}的生产线意外崩溃，维修占用了大量资源。" },
                { title:"喷气旅惨败", desc:"精锐的喷气旅在{planet}遭遇埋伏，损失惨重。" }
            ],
            positive:[
                { title:"产能提升", desc:"{planet}的工厂优化算法升级，生产速度大幅提高。" },
                { title:"核心超频", desc:"成功对{planet}的所有作战机械战斗核心进行安全超频，效率提升。" },
                { title:"自动维修协议", desc:"{planet}的全体单位启用先进自修复系统，战斗力恢复。" },
                { title:"炽灼旅大捷", desc:"炽灼旅在{planet}的作战取得巨大成功，取得决定性胜利。" }
            ]
        }
    };

    const PLANET_NAME_LIST = [
        "奥肖恩星","莫里迪亚","杜马提尔","克伦达苏","艾维斯","莫拉戴什","沃提斯","利索斯","塞拉瑞","瓦提昂","利斯瑞斯","泽菲拉",
        "塔西斯","沃拉克","尼克斯","科尔瓦","厄林多","奎拉斯","维斯佩拉","派罗尼斯","加兰提斯","泰罗斯","内维昂","塞里尼斯","萨洛昂","沃克西斯",
        "泽里斯","水晶星","伊利里亚","沃拉思","维克西隆","伊德里斯","瓦尼斯12","赛罗尼斯","弗洛兰提斯","泽塔","摩沃斯","伊里康","塔沃克","维瑞克斯",
        "泽诺尼斯","塔尔沃利亚","瓦托5","菲拉西斯","瑟瑞昂","德拉卡瑞斯","维尔克罗斯","卡利克斯3","沃达拉","艾斯提拉","米兰达斯","泽卡9","普罗米拉","维索拉",
        "泰拉隆","扎罗斯","派洛斯","厄里索斯","奈多尔","瓦尔特雷克斯","泽拉伦","塞里斯","维拉瑞斯","德拉克斯","佐瓦拉","奎隆","丽桑德拉","维瑞西亚",
        "特尔玛拉","格瑞松","佐拉里斯","伏尔托瑞斯","奈克萨拉","奥罗拉站","斯特拉拉","月神星","索拉拉","奈布隆","塞莱斯廷","奥瑞尼斯","伊克利普斯",
        "阿克图鲁斯","贝拉特里克斯","卡佩拉","迪奈布","埃尔纳特","佛马浩特","伽克鲁斯","哈达尔","伊扎尔","贾巴","考斯","莱萨斯","马尔菲克",
        "奈卡尔","奥菲利亚","普罗西昂","瑞吉尔","天狼星","苏班","维加","瓦萨特","扎尼亚","阿尔吉尼","巴腾","库尔萨","迪夫达","艾达西",
        "弗鲁德","戈梅萨","霍玛姆","伊克利尔","吉","克拉兹","林克斯","马尔卡布","纳维","奥瑞恩","孔雀星","拉纳","萨比克","塔尼亚",
        "赤霄","苍峦","星渊","雷泽","霜落","炎煌","风歌","云涛","玄冰","碧穹","银砂","紫电","青岚","赤霞","幽泉","明光",
        "碎星","流光","沉舟","飞虹","定海","镇岳","凌霄","星枢","太微","紫薇","天市","北辰","扶摇","若木","建木","归墟","不周","昆仑","蓬莱","方丈","瀛洲","岱舆","员峤"
    ];

    return { MAP_SIZES, CAMPS, CAMP_KEYS, STRATEGIC_EVENTS, PLANET_NAME_LIST };
})();