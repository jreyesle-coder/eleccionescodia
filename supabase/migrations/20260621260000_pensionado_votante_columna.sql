-- ════════════════════════════════════════════════════════════════════════
-- Columna pensionado_votante: identifica al grupo especial de pensionados
-- del ISES-CODIA que SÍ pueden votar (listado oficial 2026).
-- Distinto de pensionado=true (pensionados generales que NO pueden votar).
-- ════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna
alter table public.padron
  add column if not exists pensionado_votante boolean not null default false;

create index if not exists idx_padron_pensionado_votante
  on public.padron(pensionado_votante) where pensionado_votante = true;

-- 2. Marcar los 1515 existentes en el padrón
update public.padron
   set pensionado_votante = true
 where codigo in (
   1085,1107,1303,689,794,381,432,581,3274,413,2337,177,40,805,257,2677,995,44,363,338,
   3566,1422,4643,1750,241,327,1366,666,98,1333,451,10224,1076,99,1339,1084,922,639,3140,
   795,1002,2705,1285,395,71,46,738,677,3545,906,1335,1402,614,856,9813,12526,620,3277,952,
   759,1579,948,965,1283,333,1845,1550,872,1876,833,173,412,1375,303,1182,1022,1794,692,932,
   879,282,1133,704,727,915,845,586,345,508,10876,688,50,1398,1508,2052,2315,1197,194,938,
   1029,612,1507,835,1558,2366,19157,758,958,753,1304,1904,5591,132,720,488,7546,971,10603,
   3336,49,1383,442,667,707,781,1212,970,1287,561,664,2063,5516,1382,11301,18493,4639,2113,
   2737,950,865,1467,12292,261,829,648,70,1331,208,867,5635,2173,22811,21387,2345,5018,930,
   1064,2060,6488,1932,22736,1847,1877,3647,77,1014,374,137,1198,919,4014,138,730,3535,9825,
   140,1103,1138,1193,861,7669,2962,882,19877,1280,4233,3118,986,3641,1740,990,5937,1773,
   1887,1043,918,855,5812,1194,616,5970,1172,2830,2777,1142,1352,1999,706,2212,7259,2600,969,
   1344,1675,643,3406,718,1417,1381,1808,5910,4052,565,841,1012,824,3366,1720,181,1489,910,
   267,1321,1997,1900,7476,842,1379,231,786,1783,876,1860,3864,981,575,1978,1962,2249,1161,
   1359,1712,3715,923,3784,3866,1097,6242,896,21640,3363,678,937,1726,809,1491,5071,2261,
   1494,1782,524,2066,1591,1067,6652,2069,2183,1454,1598,968,1406,2802,1369,8948,1839,1201,
   921,533,11056,10493,5588,4354,739,1016,1979,710,423,4096,1644,1328,16103,4992,1830,2039,
   3284,2153,8257,2734,1440,1967,16102,2003,2388,543,1810,2848,1184,5299,17496,1568,3693,
   1439,2447,4204,1006,1966,9511,1840,3106,633,10426,9408,2483,2576,6237,7255,158,4264,3064,
   1480,1268,2294,5167,1843,2291,1311,4588,672,2061,1246,2724,13527,4463,10356,1420,3262,
   2727,1548,5772,2663,7002,10431,15560,1056,5156,4054,1238,1496,7889,2140,4771,2303,1625,
   628,14082,5882,9296,3005,2503,1360,951,3834,7674,3271,554,6465,6341,3454,2473,2240,2100,
   3178,2277,13178,5347,2511,1931,1754,3409,1593,1384,3774,15388,2527,3388,5602,4062,7708,
   2444,1814,5787,1775,5092,3194,4044,10317,1705,886,2991,2346,9697,3154,3265,1957,4927,
   12110,2203,2373,3487,9654,1806,3201,2548,1254,29738,5483,2820,2952,1488,2367,2687,2201,
   15559,1641,5542,1690,11953,2333,3712,3478,2730,1387,2362,1157,3313,3346,14318,4859,1604,
   1920,3287,7790,5777,5605,7473,2178,5100,1844,5697,3868,2900,1436,4000,1881,4106,1149,
   8178,2504,3778,5437,5211,10896,1476,11420,12490,5232,4178,2475,12926,2918,2761,2660,4767,
   2384,3671,912,1306,8252,4522,1763,3276,2446,2161,1894,713,12515,1255,10187,2776,10750,
   4942,8420,141,8715,4391,870,4059,2982,5316,3325,5158,3059,2409,13713,10747,2160,4279,2009,
   1926,4733,5412,13715,2318,2382,1921,17482,8588,5833,1153,4112,5914,1458,8787,1940,3030,
   1337,7484,2850,2813,588,3016,1915,1663,1730,1984,17971,5917,30623,3735,2122,11347,6285,
   5286,2171,4031,15223,1892,1946,3862,3141,4661,5631,3908,5514,13504,3630,4401,2037,232,
   12160,2765,3186,4848,1998,5339,3163,11103,3347,2196,8253,6098,3375,8,2323,2064,2566,3499,
   1802,6775,4081,3497,8151,11624,390,1948,1492,4858,5485,1974,1975,3136,3984,10355,3233,
   1769,9290,880,3307,6440,7866,2676,1310,5704,2721,7993,3652,18615,5355,3816,9249,4213,
   15737,1118,3725,1838,2057,5977,2278,3095,6757,2951,2218,2698,5517,3402,2281,1714,4090,
   3882,4085,4190,2751,7590,6525,2358,2627,17083,3846,10886,2572,2980,4218,1482,4459,13540,
   14369,3891,3150,7801,3132,8703,2455,2477,2913,22761,4200,913,963,3543,36911,3613,7676,
   3105,2298,2732,5545,2399,242,3589,3112,4983,7245,9830,3733,3504,7582,5329,1189,2550,7188,
   62,2903,3492,3557,1952,5845,2726,4696,4146,3012,3831,11920,4013,3782,6621,4451,10088,2700,
   31339,2986,5007,3250,3704,2731,2568,2098,1274,3161,1426,3692,2990,16164,1687,2332,3291,
   10884,27486,11341,4766,9910,3596,2707,16935,3133,2587,4181,3799,4276,3805,5690,4175,15243,
   3218,4144,8396,9550,18186,5776,9278,8161,7294,10195,1927,2188,11120,1669,7598,2335,4228,
   2693,2211,4169,9548,2590,7840,3787,6430,5832,7085,12607,1240,1191,7955,11444,2749,4773,
   6085,1924,12795,8083,10864,12154,23385,9126,9753,4249,20127,10285,7044,9605,16558,16262,
   3490,3829,16631,1914,4211,7094,8262,4454,7132,8027,5620,2268,1414,1451,4042,6167,2124,
   6273,8167,3385,2870,13458,3542,9185,9379,7628,3092,4921,19588,2502,7260,2983,2019,3677,
   9860,3381,8011,1376,6478,2474,2020,2868,12728,8331,14748,7646,4399,3755,7215,3883,9703,
   3954,8351,4658,1068,7235,3257,5056,14536,2048,6513,27568,8616,9457,17951,12091,2266,5883,
   4847,2273,2805,11964,4063,4121,6072,3670,2860,4176,6914,7718,5614,13682,14295,5506,13248,
   11708,7386,8139,31296,3328,14032,1207,4355,7460,5834,4462,6249,2402,4580,1688,19558,16673,
   6639,4615,13469,3360,4272,1083,24700,4024,2256,8052,17716,1318,772,1939,2988,7544,3550,
   5677,1718,13707,4185,5368,4582,3172,4493,10949,2397,9072,16005,13716,8285,4884,16920,4564,
   2759,7573,3786,3007,1995,11923,12584,5838,5398,9819,3426,37184,11883,3739,7194,2641,6519,
   10727,6146,9702,12041,3401,13069,2541,2310,3292,16256,12817,3948,1916,15967,2352,33349,
   5250,813,5808,4686,4016,11112,8800,2914,8651,11531,14930,4514,11950,3793,1747,7122,3905,
   3213,7963,4022,2355,7875,4801,8807,5198,2329,9631,5046,3395,7109,5901,12157,10926,4602,
   4841,17708,5460,11937,903,6467,2886,5289,7856,10558,10450,4904,15058,4574,2797,2381,3633,
   13354,12648,13188,11327,8088,17321,13959,4448,6801,7930,3314,7523,7903,4011,2540,2257,
   2609,5521,24092,2425,15525,7128,11141,11349,10155,1140,1080,7027,2585,18828,37400,24419,
   5144,16129,9693,17736,9324,1929,4789,14667,2869,6248,17519,2581,5934,7421,7862,18242,3638,
   3992,2574,26675,6292,2351,24656,8234,18295,16896,1728,4958,3926,20026,7742,4813,1363,4488,
   10494,2056,7015,8368,9809,2096,11436,7258,3950,3764,2242,12791,4945,12144,3210,7608,5716,
   4465,10464,4666,16377,7713,9393,1696,6814,5330,6995,12304,19336,6856,23719,8758,2666,7593,
   7422,5811,8338,8309,11596,5748,10691,9308,4435,3776,13818,5439,6075,9556,4603,7535,9137,
   18905,16772,16773,6434,9492,6812,8130,2498,9676,8909,9808,12028,5607,4360,5647,5419,6263,
   6678,5530,2204,3071,2085,3632,1785,16515,15591,8718,3702,6791,4752,41985,6716,8381,7390,
   2184,1727,5491,15656,10820,39662,1697,4505,14790,7062,10115,4618,18278,10781,8336,2963,
   2901,5227,5654,11393,2773,2818,3153,17051,2088,3716,13340,28303,5256,16250,13659,8938,
   16741,1708,10160,3361,9152,7828,10717,10548,7677,18786,21897,5570,3648,17995,1407,7315,
   6315,8816,3989,4610,7703,7300,2431,8451,8690,9625,6591,4829,3212,3110,1211,1617,22471,
   5909,10935,6110,5162,4728,8259,12596,6053,16105,2582,34349,4474,14608,11515,7238,4660,
   11710,6489,5133,1412,5713,6034,8991,12856,11935,9671,10029,7249,6790,8572,7141,5253,6083,
   3958,8323,10568,9144,3896,7216,13059,3165,12342,5891,4236,3259,7845,20132,20445,6543,6602,
   15438,7917,9065,13115,8737,8059,3480,1007,5390,5085,8224,5740,5590,2051,4990,2928,13024,
   21397,11305,4746,10714,1701,3209,3681,2804,7196,12609,2561,15032,8082,5821,8557,7417,3669,
   15540,3058,12946,6296,1721,6415,1987,11187,9601,14529,9199,17552,11724,9165,16979,1866,
   5916,3428,26596,20102,580,8833,3324,17007,45239,20857,19245,1790,2806,9039,6857,3872,4845,
   2984,4183,3738,6017,12703,7077,4076,10773,4486,7237,9668,5443,3918,8072,4331,6459,3836,
   5784,8379,17643,10734,20149,27014,5766,10071,2755,3706,5387,5551,15861,6943,5013,6356,
   7554,7577,3046,4012,6359,8677,16282,3067,3445,12713,28790,3268,2090,13214,7759,9874,4352,
   12858,7244,6278,3025,10061,6768,11435,9237,3356,9055,7374,2290,19164,13167,15498,14684,
   10405,10363,11471,5149,16818,11233,9317,11759,4948,3367,1618,7144,1734,11399,31728,5839,
   7528,9321,16636,4596,6187,6854,4579,5520,5835,37905,7700,5660,18742,13803,8187,4002,6458,
   9493,12172,5671,6813,15102,5122,5852,4723,13081,8282,16811,1049,5072,10569,8682,1878,
   11621,5856,6235,6392,12476,2486,3691,4745,5975,17248,35658,26684,4891,4955,5380,10715,
   8669,4030,11641,3565,6668,6001,14435,3260,5155,9618,1397,16336,11498,11799,3121,11156,
   10907,6293,31270,5552,2007,3584,9660,11578,3100,15110,4365,5781,4393
 );

-- 3. Insertar los 85 que no estaban en el padrón (ON CONFLICT solo actualiza la marca)
insert into public.padron (codigo, nombre_completo, pensionado_votante, pensionado)
values
(789,'JULIO GARCIA CAMBIER',true,true),
(304,'MANUEL C. DE LA HUERGA',true,true),
(712,'LUIS ANT. FUSTER',true,true),
(276,'MERCEDES CONDE PAUSAS',true,true),
(163,'VINICIO ORLANDO ADAMS',true,true),
(566,'PLINIO ANT. DE LOS SANTOS',true,true),
(574,'JOSE PRIAMO PEREZ P.',true,true),
(539,'JORGE R. GONZALEZ',true,true),
(394,'Mario Arturo Noboa',true,true),
(1890,'LADISLAO VITTINI',true,true),
(547,'MARTHA M.SALOME POLANCO',true,true),
(350,'VICTOR HUGO ESPINOSA',true,true),
(351,'ANASTACIO FIGUEREO ALCANTARA',true,true),
(583,'ENRIQUE ESTRADA GOMEZ',true,true),
(125,'PLINIO E. CASTILLO GLEZ',true,true),
(42,'MARIO E. HEREDIA PEREZ',true,true),
(219,'MANUEL ANT. VIDAL MEDINA',true,true),
(379,'JAIME CAPELL BELLO',true,true),
(63,'LUIS ARAMBILET LARRAZABAL',true,true),
(540,'JUAN T. FDEZ. CONSUEGRA',true,true),
(380,'ELPIDIO J. FCO. ORTEGA ALVAREZ',true,true),
(389,'FRANCISCO RAUL GLEZ. CASTILLO',true,true),
(406,'RAFAEL ESPINOSA ACOSTA',true,true),
(14407,'HECTOR EMILIO PEREZ NINA',true,true),
(482,'LUIS CONRADO DEL CASTILLO',true,true),
(310,'ARQ. JONRRE HACHE DEUD',true,true),
(723,'JOAQUIN FELIX LORA SARITE',true,true),
(54,'JOSÉ ANTONIO ACEVEDO ALFAU',true,true),
(1506,'LUIS PAULINO RORÍGUEZ G.',true,true),
(68,'FERNANDO A. FRANCO PENZO',true,true),
(147,'PEDRO B. SUAZO PEREZ',true,true),
(654,'JUAN ANT. MORFA',true,true),
(8767,'JULIO CESAR MARMOLEJOS',true,true),
(551,'RAFAEL LEONIDAS UREÑA PEREZ',true,true),
(21,'JUAN FCO. LOPEZ RODRIGUEZ',true,true),
(745,'CIRIACO ARTURO RAMIREZ MODESTO',true,true),
(172,'NOEL GIRALDI MEDINA',true,true),
(57,'JULIO EDUARDO GARCIA DE JESUS',true,true),
(1013,'JOSE ANTONIO BONA PRANDY',true,true),
(1879,'APOLINAR MUÑOZ PEREZ',true,true),
(309,'FELIX MARIA RUIZ SALVAT',true,true),
(280,'JULIO A. HERNANDEZ SANTELISES',true,true),
(717,'FREFDDY DE LEON MONTES DE OCA',true,true),
(4018,'RAFAEL A. ORTIZ ARISTY',true,true),
(450,'DIOCLES PEÑA LOPEZ',true,true),
(863,'LUIS ARMANDO DEL ROSARIO CEBALLOS',true,true),
(3442,'JOSE ATILANO PAULINO JIMENEZ',true,true),
(4640,'JUAN ALBERTO POLANCO RODRIGUEZ',true,true),
(12170,'JOSE DEL CARMEN ROJAS',true,true),
(1370,'RAMON AMABLE SANCHEZ DE LA ROSA',true,true),
(777,'MAXIMO MANUEL HENRIQUEZ TORRES',true,true),
(133,'JOSE DEL CARMEN CUELLO ABREU',true,true),
(1235,'SONY ANTONIO VELEZ TERRERO',true,true),
(1597,'ANGEL ALIRO CARO RAMIREZ',true,true),
(1315,'RAMON AMADO CASADO CUEVAS',true,true),
(8123,'ADOLFO RICARDO DOMINGUEZ DEPRADEL',true,true),
(6436,'LUIS MAXIMO SEGURA RODRIGUEZ',true,true),
(1816,'LUIS A. RAMON SALCEDO RODRIGUEZ',true,true),
(1368,'RAMON RAFAEL OLIVIER MARTINEZ',true,true),
(5020,'ELPIDIA MARIA ZAPATA PIMENTEL',true,true),
(5401,'EDDYS BIENVENIDO TERRERO SANCHEZ',true,true),
(7529,'MANUEL ANTONIO MAñON ANDUJAR',true,true),
(558,'AQUILES PIMENTEL CASTRO',true,true),
(1645,'PABLO AMERICO JIMENEZ MEJIA',true,true),
(5760,'RAFAEL EMILIO MEDRANO PEREZ',true,true),
(1432,'DIANA ESTELA LA PAIX RODRIGUEZ DE',true,true),
(1220,'JOSE ANTONIO HERNANDEZ HUNGRIA',true,true),
(7046,'COSME RAFAEL DAMIAN RODRIGUEZ',true,true),
(635,'ANIBAL OSCAR FERMIN TORRO',true,true),
(1912,'DAVID WILFREDO VINICIO RODRIGUEZ MENDEZ',true,true),
(16784,'GUSTAVO ENRIQUE PEÑA',true,true),
(1605,'RAFAEL GONZALEZ GONZALEZ',true,true),
(13528,'JOSE DANIEL MOQUETE MEDINA',true,true),
(3117,'RAMON ANTONIO ARECHE',true,true),
(440,'ANGEL CUSTODIO RESTITUYO GARCIA',true,true),
(3734,'GABINO HERNNADEZ',true,true),
(15816,'HECTOR VINICIO TAVAREZ MOREL',true,true),
(1144,'JUAN PABLO HERNANDEZ ALBERTO',true,true),
(9049,'BENNY BASILIO PEETS DEVERS',true,true),
(52836,'RAFAEL MEDRANO SANCHEZ',true,true),
(10190,'MANUEL ERNESTO ORTIZ DURAN',true,true),
(1388,'FRANCISCO ANTONIO ACOSTA MORETA',true,true),
(11587,'ESTEDY WILSON JACOBS SPENCER',true,true),
(4476,'JUAN EDIS REYES VALERA',true,true),
(1413,'JOSE MARIA CAMACHO TEJADA',true,true)
on conflict (codigo) do update set pensionado_votante = true, pensionado = true;

-- 4. Actualizar el RPC para usar pensionado_votante
drop function if exists public.buscar_pensionados_votantes(text, text, text);
create or replace function public.buscar_pensionados_votantes(
  p_regional text default null,
  p_nucleo   text default null,
  p_q        text default null
)
returns table (
  id                     bigint,
  codigo                 text,
  nombre_completo        text,
  cedula                 text,
  telefono               text,
  celular                text,
  regional               text,
  provincia              text,
  nucleo                 text,
  carrera                text,
  pensionado             boolean,
  nuevo_integrante       boolean,
  tiene_deuda            boolean,
  monto_deuda            int,
  centro_votacion        text,
  confirmado_por         text,
  confirmacion_intencion text,
  confirmacion_at        timestamptz
)
language plpgsql security definer stable set search_path = public as $$
declare
  q        text  := trim(coalesce(p_q, ''));
  q_digits text  := regexp_replace(q, '[^0-9]', '', 'g');
  tokens   text[];
  token    text;
  sql_str  text;
begin
  if public.mi_rol() not in ('presidente') then
    return;
  end if;

  -- Búsqueda por cédula
  if q ~ '^[\d\-]+$' and length(q_digits) >= 9 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where p.pensionado_votante = true
        and regexp_replace(coalesce(p.cedula,''), '[^0-9]', '', 'g') = q_digits
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo limit 50;
    return;
  end if;

  -- Búsqueda por código exacto
  if q ~ '^\d+$' and length(q) <= 6 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where p.pensionado_votante = true
        and p.codigo = q::integer
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      limit 10;
    return;
  end if;

  -- Sin query: todos
  if length(q) = 0 then
    return query
      select
        p.id, p.codigo::text, p.nombre_completo, p.cedula,
        p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
        p.pensionado, p.nuevo_integrante,
        coalesce(p.monto_deuda, 0) > 0
          or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
        coalesce(p.monto_deuda, 0) as monto_deuda,
        p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
      from public.padron p
      where p.pensionado_votante = true
        and (p_regional is null or p.regional = p_regional)
        and (p_nucleo   is null or p.nucleo   = p_nucleo)
      order by p.nombre_completo limit 5000;
    return;
  end if;

  -- Búsqueda por nombre
  if length(q) < 3 then return; end if;
  tokens := array(
    select t from unnest(string_to_array(q, ' ')) t where length(trim(t)) >= 2
  );
  if array_length(tokens, 1) is null then return; end if;

  sql_str := $s$
    select p.id, p.codigo::text, p.nombre_completo, p.cedula,
      p.telefono, p.celular, p.regional, p.provincia, p.nucleo, p.carrera,
      p.pensionado, p.nuevo_integrante,
      coalesce(p.monto_deuda, 0) > 0
        or exists (select 1 from public.deudas_votantes d where d.codigo = p.codigo) as tiene_deuda,
      coalesce(p.monto_deuda, 0) as monto_deuda,
      p.centro_votacion, p.confirmado_por, p.confirmacion_intencion, p.confirmacion_at
    from public.padron p
    where p.pensionado_votante = true
  $s$;

  if p_regional is not null then
    sql_str := sql_str || format(' and p.regional = %L', p_regional);
  end if;
  if p_nucleo is not null then
    sql_str := sql_str || format(' and p.nucleo = %L', p_nucleo);
  end if;
  foreach token in array tokens loop
    sql_str := sql_str || format(' and p.nombre_completo ilike %L', '%' || trim(token) || '%');
  end loop;
  sql_str := sql_str || ' order by p.nombre_completo limit 500';

  return query execute sql_str;
end;
$$;

grant execute on function public.buscar_pensionados_votantes(text, text, text) to authenticated;

-- 5. Verificación
select 'pensionados_votantes_especiales' as dato, count(*) from public.padron where pensionado_votante = true;
