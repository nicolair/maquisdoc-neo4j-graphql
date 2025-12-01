import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j  from "neo4j-driver";
// test rebuild
// dans l'ancienne v : typeDefs gql ??


const typeDefs = `#graphql
enum OrdAlpha {
  ASC
  DESC
}

input TriDocument {
  titre: OrdAlpha
  description: OrdAlpha
}

type Document @node {
    _id: ID! @cypher(
      statement: "RETURN ID(this) AS ident",
      columnName: "ident") 
    titre: String
    date: String @cypher(
      statement: "RETURN toString(this.date) as date",
      columnName: "date"
    )
    typeDoc: String
    description: String
    url: String
    urlSrc: String
    urlEnon: String
    urlCorr: String
    urlSrcEnon: String
    urlSrcCorr: String
    concepts: [Concept!]! @relationship(type: "DOCUMENTE", direction: OUT)
    conceptsEVAL: [Concept!]! @relationship(type: "EVALUE", direction: OUT)
    conceptsINDEXE: [Concept!]! @relationship(type: "INDEXE", direction: OUT)
    evenements: [Evenement!]! @relationship(type: "UTILISE", direction: IN)
    contenants: [Document!]! @relationship(type: "CONTIENT", direction: IN)
}

type DocumentVoisin {
    typeRel: String
    out: Boolean
    docType: String
    docTitre: String
    docDescription: String
    docUrl: String
    docId: ID!
}

type ConceptVoisin {
    typeRel: String
    out: Boolean
    conceptLitteral: String
    conceptDescription: String
    conceptId: ID!
}

type Concept @node {
    litteral: String
    discipline : String
    description: String
    _id: ID! @cypher(
      statement: "RETURN ID(this) AS id",
      columnName: "id") 
    documents: [Document!]! @relationship(type: "DOCUMENTE", direction: IN)
    listexos: [Document!]! @cypher(
      statement: """
        MATCH (f {typeDoc: 'liste exercices'})-[:EVALUE]->(this)
        RETURN f AS liste
      """,
      columnName:"liste")
    documentsvoisins: [DocumentVoisin] @cypher(
      statement: """ 
        MATCH (this:Concept)-[r]-(d:Document)
        WITH {
           typeRel: type(r) ,
           out: id(endNode(r))=id(d) ,
           docType : d.typeDoc ,
           docTitre: d.titre ,
           docDescription: d.description,
           docUrl: d.url,
           docId: id(d)
        } AS DocumentVoisin
        RETURN DocumentVoisin AS docvois
      """,
      columnName: "docvois")
    conceptsvoisins: [ConceptVoisin] @cypher(
      statement: """ 
        MATCH (this:Concept)-[r]-(c:Concept)
        WITH {
           typeRel: type(r) ,
           out: id(endNode(r))=id(c) ,
           conceptLitteral : c.litteral ,
           conceptDescription: c.description,
           conceptId: id(c)
        } AS ConceptVoisin
        RETURN ConceptVoisin AS concvois
      """,
      columnName: "concvois")
}

type Evenement @node {
    nom: String 
    typeEvt: String
    _id: ID! @cypher(
      statement: "RETURN ID(this) AS ident",
      columnName: "ident") 
    concepts: [Concept!]! @relationship(type: "EVALUE", direction: OUT)
    documents: [Document!]! @relationship(type: "UTILISE", direction: OUT)
    sousevenements: [Evenement!]! @relationship(type: "CONTIENT", direction: OUT)
}

type Query {
  feuilleexercicesdocuments : [Document!]! @cypher(
    statement: """
      MATCH (d:Document {typeDoc:'liste exercices'})
      RETURN d AS listexos
    """,
    columnName : "listexos"),
  exercicedocuments : [Document!]! @cypher(
    statement: """
      MATCH (d:Document {typeDoc:'exercice'})
      RETURN d AS exodoc
    """,
    columnName: "exodoc")
  coursdocuments : [Document!]! @cypher(
      statement: """
        MATCH (d:Document {typeDoc:'cours'})
        RETURN d AS coursdoc
      """,
      columnName: "coursdoc")
  problemedocuments : [Document!]! @cypher(
    statement: """
      MATCH (d:Document {typeDoc:'problème'})
      RETURN d AS pbdoc
    """,
    columnName: "pbdoc")
  semaines : [Evenement!]! @cypher(
    statement: """
      MATCH (s:Evenement {typeEvt:'semaine de colle'})
      RETURN s AS evt
    """,
    columnName: "evt")
  searchpbs (mot:String): [Document!] @cypher(
    statement: """
      CALL db.index.fulltext.queryNodes('TitresEtDescriptions', $mot)
        YIELD node, score
        WHERE node.typeDoc = 'problème'
      RETURN  node AS titredescrp
    """,
    columnName: "titredescrp")
  searchcours (mot:String): [Document!] @cypher(
    statement: """
      CALL db.index.fulltext.queryNodes('TitresEtDescriptions', $mot)
        YIELD node, score
        WHERE node.typeDoc = 'cours'
      RETURN  node AS mot
    """,
    columnName: "mot")
  searchconcepts (mot:String): [Concept!] @cypher(
    statement: """
      CALL db.index.fulltext.queryNodes('LittérauxEtDescriptions', $mot)
        YIELD node
      RETURN  node AS mot
    """,
    columnName: "mot")
}
`;


const neo4j_url = process.env.NEO4J_URL || "bolt://localhost:7687"
const neo4j_pw = process.env.NEO4J_PASSWORD

const neo4j_username = process.env.NEO4J_USERNAME
const driver = neo4j.driver(
    neo4j_url,
    neo4j.auth.basic(neo4j_username,neo4j_pw)
    );

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const server = new ApolloServer({
  schema:await neoSchema.getSchema(),
});

const { url } = await startStandaloneServer(server, {
    listen: { port: 3003},
});

console.log(`Server ready at ${url}`);

//neoSchema.getSchema().then((schema) => {
//  const server = new ApolloServer({
//      schema,
//  });

//  server.listen(3003,"0.0.0.0").then(({ url }) => {
//      console.log(`Server ready at ${url}`);
//
//})
