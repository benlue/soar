CREATE TABLE Person
(
    psnID   bigint not null auto_increment,
    name    varchar(64),
    primary key (psnID)
)
engine = InnoDB;


CREATE TABLE GeoLoc
(
   geID                 bigint not null auto_increment,
   addr                 varchar(256),
   latitude             decimal(10,7),
   longitude            decimal(10,7),
   primary key (geID)
)
engine = InnoDB;

CREATE TABLE PsnLoc
(
   geID                 bigint not null,
   psnID                 bigint not null,
   primary key (geID, psnID)
)
engine = InnoDB;

alter table PsnLoc add constraint FK_plcRge foreign key (geID)
      references GeoLoc (geID) on delete cascade on update cascade;

alter table PsnLoc add constraint FK_plcRpsn foreign key (psnID)
      references Person (psnID) on delete cascade on update cascade;
