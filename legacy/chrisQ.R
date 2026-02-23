'''
This is the script used to generate data from Van Berkel Oracle server.
'''

rm(list=ls())
library(Billy)
library(dplyr)
library(stringr)

# (0) INI ====
startDate <- "2026-02-02"
currentServer <- 1

# (1) Rotation info ==== # NO OPERATOR
colsRotation <- c("SEQ","BARGE",
                  "SCOPEINLOCATION","PLANNEDSCOPEINDATE","PLANNEDSCOPEINTIME",
                  "SCOPEOUTLOCATION","PLANNEDSCOPEOUTDATE","PLANNEDSCOPEOUTTIME")

dfRotation <- ORCLq(server = currentServer,
                    schema = "VOYAGEROTATION",
                    dateToFilter = "PLANNEDSCOPEINDATE",
                    from = startDate,
                    select = colsRotation)

# (2) Info Barges ====
colsBarge <- c("CODE","DESCR","MAXTEU","MAXWEIGHT","MAX20FT","MAX40FT","MAX45FT")

codeBarges <- unique(dfRotation$BARGE)

dfBarge <- ORCLq(server = currentServer,
                 schema = "BARGE",
                 listFilter = "CODE",
                 listToFilter = codeBarges,
                 select = colsBarge)

# (3) Voyages ====
colsVoyage <- c("CODE","EXTERNALCODE",
                "PORT_FROM","DEPDATE","DEPTIME",
                "PORT_TO","ARRDATE","ARRTIME",
                "IE","BARGE")

seqsRotation <- as.character(dfRotation$SEQ)

dfVoyage <- ORCLq(server = currentServer,
                  schema = "VOYAGE",
                  listFilter = "EXTERNALCODE",
                  listToFilter = seqsRotation,
                  select = colsVoyage)

# (4) Elements ====
colsVoyElm <- c("VOYAGE", "PORT_FROM", "PORT_TO",
                "MAXTEU", "TOTALTEU", "MAXWEIGHT", "TOTALWEIGHT")

codeVoyages <- unique(dfVoyage$CODE)

dfVoyElm <- ORCLq(server = currentServer,
                  schema = "VOYELM",
                  listFilter = "VOYAGE",
                  listToFilter = codeVoyages,
                  select = colsVoyElm)

# (5) Term ==== # NO PORT
colsVoyTerm <- c("VOYAGE", "ADDRESS", "VOYAGEROTATION",
                 "EDATE", "ETIME", "ETDDATE", "ETDTIME","LD",
                 "RESERVED20","RESERVED30","RESERVED40","RESERVED40UP",
                 "TOTAL20","TOTAL30","TOTAL40","TOTAL45","PORTBASEMCATOTALSENT",
                 "COPINOCODE",
                 "PORTBASEMCAPTADATE","PORTBASEMCAPTATIME","PORTBASEMCAPTDDATE","PORTBASEMCAPTDTIME",
                 "PORTBASEMCAFIXEDWINDOW")

dfVoyTerm <- ORCLq(server = currentServer,
                   schema = "VOYTERM",
                   listFilter = "VOYAGE",
                   listToFilter = codeVoyages,
                   select = colsVoyTerm)

# (6) Containers ==== # GEEN PLANDATE GEEN CLIENT GEEN TRANSFER GREEN GROSS/WEL NETT
# (6.1) Import
codeCoyagesImp <- unique(dfVoyage$CODE[dfVoyage$IE == "I"])

colsUnitImp <- c("CNTR","BOOKING","ADDRESS_IMP",
                 "MS_EX",
                 "PRESENTIMPORT","RELEASEDIMPORT","CUSTOMSCLEAREDIMPORT","BLOCKEDIMPORT","OTHERISSUEIMPORT",
                 "PUDATE","PUTIME","LATESTPUDATE","LATESTPUTIME",
                 "VOYAGE_IMP",
                 "ARRDATE","ARRTIME",
                 "ADDRESS_INL","INLDATE","INLTIME",
                 "UNITTYPE","FULL_IMP",
                 "NETT",
                 "ADDRESS_SHIPCOM","CRTYPE","CNTRSTATUS")

dfUnitImp <- ORCLq(server = currentServer,
                   schema = "UNIT",
                   listFilter = "VOYAGE_IMP",
                   listToFilter = codeCoyagesImp,
                   select = colsUnitImp)

# (6.1) Export # NO CLIENT # NO PTA
codeCoyagesExp <- unique(dfVoyage$CODE[dfVoyage$IE == "E"])

colsUnitExp <- c("CNTR","BOOKING",
                 "ADDRESS_INL",
                 "INLDATE","INLTIME",
                 "VOYAGE_EXP",
                 "DEPDATE","DEPTIME",
                 "ADDRESS_EXP",
                 "CORRECTORDEREXPORT","CUSTOMSDOCAVAILABLEEXPORT","BLOCKEDEXPORT","BEFORECARGOOPENINGEXPORT","OTHERISSUEEXPORT",
                 "FIRSTDELDATE","FIRSTDELTIME","DELDATE","DELTIME",
                 "UNITTYPE","FULL_EXP","ADDRESS_SHIPCOM","CNTRSTATUS")

dfUnitExp <- ORCLq(server = currentServer,
                   schema = "UNIT",
                   listFilter = "VOYAGE_IMP",
                   listToFilter = codeCoyagesImp,
                   select = colsUnitExp)

dfUnitExp$ADDRESS_EXP

# (7) # Transfers
dfTransfers <- ORCLq(server = currentServer,
                     schema = "TRANSFER",
                     dateToFilter = "TRANSPORTDATE",
                     from = startDate)

dfTransfers <- dfTransfers %>%
  filter(str_detect(TRUCK, "IBT"))
  
writexl::write_xlsx(dfBarge, "dfBarge.xlsx")
writexl::write_xlsx(dfRotation, "dfRotation.xlsx")
writexl::write_xlsx(dfTransfers, "dfTransfers.xlsx")
writexl::write_xlsx(dfUnitExp, "dfUnitExp.xlsx")
writexl::write_xlsx(dfUnitImp, "dfUnitImp.xlsx")
writexl::write_xlsx(dfVoyage, "dfVoyage.xlsx")
writexl::write_xlsx(dfVoyElm, "dfVoyElm.xlsx")
writexl::write_xlsx(dfVoyTerm, "dfVoyTerm.xlsx")

